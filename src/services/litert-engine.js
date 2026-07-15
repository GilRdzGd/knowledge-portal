import { buildGroundedPrompt } from "./assistant-evidence.js";
import { LITERT_CONFIG } from "./litert-config.js";

let engine = null;
let loadPromise = null;
let activeConversation = null;
let generationActive = false;

function status(onStatus, state, message) {
  onStatus?.({ state, message });
}

function userMessageForError(error) {
  const text = String(error?.message || error || "").toLowerCase();
  if (
    text.includes("out_of_device_memory") ||
    text.includes("out of device memory") ||
    text.includes("skia oom") ||
    text.includes("context lost") ||
    text.includes("se agoto el tiempo")
  ) {
    return "La GPU se quedo sin memoria al inicializar el modelo local. Este modelo requiere mas VRAM disponible.";
  }
  if (text.includes("adaptador gpu") || text.includes("adapter")) return "Chrome no entrego un adaptador GPU utilizable para esta pagina.";
  if (text.includes("dispositivo gpu") || text.includes("device")) return "Chrome entrego un adaptador GPU, pero no permitio crear el dispositivo GPU.";
  if (text.includes("webgpu") || text.includes("gpu")) return "WebGPU no esta disponible o no pudo inicializarse en este navegador.";
  if (text.includes("cors")) return "No se pudo descargar el modelo por una restriccion CORS.";
  if (text.includes("network") || text.includes("fetch")) return "No se pudo descargar el modelo. Revisa la conexion.";
  if (text.includes("memory") || text.includes("allocation")) return "El navegador no tiene memoria suficiente para cargar el modelo.";
  if (text.includes("model")) return "El modelo configurado no pudo cargarse o no es compatible.";
  return "No se pudo activar la IA local. El asistente usara la respuesta determinista.";
}

function withTimeout(promise, timeoutMs, message) {
  let timeoutId = 0;
  const timeout = new Promise((_, reject) => {
    timeoutId = globalThis.setTimeout(() => reject(new Error(message)), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => globalThis.clearTimeout(timeoutId));
}

export function isLiteRtSupported() {
  const secure = Boolean(globalThis.isSecureContext) || ["localhost", "127.0.0.1"].includes(globalThis.location?.hostname || "");
  const hasWebGpu = Boolean(globalThis.navigator?.gpu);
  return {
    supported: secure && hasWebGpu,
    secure,
    webgpu: hasWebGpu,
    reason: !secure
      ? "Requiere HTTPS o localhost."
      : !hasWebGpu
        ? "Requiere WebGPU en un navegador compatible."
        : "",
  };
}

function diagnosticStep(id, label, ok, detail = "") {
  return { id, label, ok: Boolean(ok), detail };
}

async function requestGpuAdapter() {
  if (!globalThis.navigator?.gpu?.requestAdapter) return null;
  const options = [
    { powerPreference: "high-performance" },
    { powerPreference: "low-power" },
    undefined,
  ];
  for (const option of options) {
    const adapter = await globalThis.navigator.gpu.requestAdapter(option);
    if (adapter) return adapter;
  }
  return null;
}

async function verifyGpuAccess() {
  const adapter = await requestGpuAdapter();
  if (!adapter) {
    return {
      adapter: false,
      device: false,
      reason: "Chrome no entrego ningun adaptador GPU para esta pagina.",
    };
  }
  try {
    const device = await adapter.requestDevice();
    device?.destroy?.();
    return { adapter: true, device: true, reason: "" };
  } catch (error) {
    return {
      adapter: true,
      device: false,
      reason: error?.message || "No se pudo crear el dispositivo GPU.",
    };
  }
}

export async function diagnoseLiteRtEnvironment({ verifyNetwork = false } = {}) {
  const support = isLiteRtSupported();
  const steps = [
    diagnosticStep("secure", "Contexto seguro", support.secure, support.secure ? "HTTPS o localhost." : support.reason),
    diagnosticStep("webgpu", "WebGPU", support.webgpu, support.webgpu ? "navigator.gpu disponible." : support.reason),
  ];

  let gpuAccess = { adapter: false, device: false, reason: "" };
  if (support.secure && support.webgpu) {
    gpuAccess = await verifyGpuAccess();
    steps.push(diagnosticStep(
      "adapter",
      "Adaptador GPU",
      gpuAccess.adapter,
      gpuAccess.adapter ? "Chrome entrego un adaptador." : gpuAccess.reason,
    ));
    steps.push(diagnosticStep(
      "device",
      "Dispositivo GPU",
      gpuAccess.device,
      gpuAccess.device ? "Se pudo crear y liberar un GPUDevice." : gpuAccess.reason,
    ));
  }

  if (verifyNetwork && support.secure && support.webgpu && gpuAccess.adapter && gpuAccess.device) {
    try {
      const module = await import(LITERT_CONFIG.moduleUrl);
      steps.push(diagnosticStep("module", "Modulo LiteRT-LM", Boolean(module.Engine?.create), "CDN jsDelivr."));
    } catch (error) {
      steps.push(diagnosticStep("module", "Modulo LiteRT-LM", false, error?.message || "No se pudo importar el modulo."));
    }
    try {
      const response = await fetch(LITERT_CONFIG.modelUrl, {
        method: "HEAD",
        mode: "cors",
        cache: "no-store",
      });
      const size = Number(response.headers.get("content-length") || 0);
      const detail = size ? `Disponible por CORS. Tamano: ${(size / 1024 / 1024 / 1024).toFixed(2)} GB.` : "Disponible por CORS.";
      steps.push(diagnosticStep("model", "Modelo LiteRT-LM", response.ok, response.ok ? detail : `HTTP ${response.status}`));
    } catch (error) {
      steps.push(diagnosticStep("model", "Modelo LiteRT-LM", false, error?.message || "No se pudo validar el modelo."));
    }
  }

  return {
    supported: support.supported && (!support.webgpu || (gpuAccess.adapter && gpuAccess.device)),
    secure: support.secure,
    webgpu: support.webgpu,
    gpuAccess,
    steps,
  };
}

async function assertWebGpuAccess(onStatus) {
  if (!globalThis.navigator?.gpu?.requestAdapter) return;
  const gpuAccess = await verifyGpuAccess();
  if (!gpuAccess.adapter) {
    throw new Error(`adaptador gpu: ${gpuAccess.reason}`);
  }
  if (!gpuAccess.device) {
    throw new Error(`dispositivo gpu: ${gpuAccess.reason}`);
  }
  status(onStatus, "checking", "WebGPU listo.");
}

export async function loadLiteRtModel({ onStatus } = {}) {
  if (!LITERT_CONFIG.enabled) {
    throw new Error("LiteRT-LM esta deshabilitado por configuracion.");
  }
  if (engine) {
    status(onStatus, "ready", "IA local lista.");
    return engine;
  }
  if (loadPromise) return loadPromise;

  const support = isLiteRtSupported();
  if (!support.supported) {
    throw new Error(support.reason || "Navegador no compatible.");
  }

  loadPromise = (async () => {
    try {
      status(onStatus, "checking", "Comprobando compatibilidad.");
      await assertWebGpuAccess(onStatus);
      status(onStatus, "downloading", "Descargando modulo de IA local.");
      const module = await import(LITERT_CONFIG.moduleUrl);
      const Engine = module.Engine;
      if (!Engine?.create) {
        throw new Error("La API Engine.create no esta disponible en @litert-lm/core.");
      }
      status(onStatus, "initializing", "Descargando e inicializando el modelo local.");
      engine = await withTimeout(
        Engine.create({
          model: LITERT_CONFIG.modelUrl,
          mainExecutorSettings: {
            maxNumTokens: LITERT_CONFIG.contextWindowTokens,
          },
        }),
        LITERT_CONFIG.modelInitTimeoutMs || 180000,
        "Se agoto el tiempo inicializando el modelo local; si Chrome reporta VK_ERROR_OUT_OF_DEVICE_MEMORY, la GPU no tiene VRAM suficiente.",
      );
      status(onStatus, "ready", "IA local lista.");
      return engine;
    } catch (error) {
      console.error("LiteRT-LM load failed", error);
      engine = null;
      loadPromise = null;
      const friendly = new Error(userMessageForError(error));
      friendly.cause = error;
      throw friendly;
    }
  })();

  return loadPromise;
}

export async function generateGroundedAnswer({ question, evidence, onToken, signal } = {}) {
  if (generationActive) {
    throw new Error("Ya hay una generacion en curso.");
  }
  if (!engine) {
    await loadLiteRtModel();
  }
  const { system, user } = buildGroundedPrompt({
    question,
    evidence,
    maxEvidenceItems: LITERT_CONFIG.maxEvidenceItems,
    maxOutputTokens: LITERT_CONFIG.maxOutputTokens,
  });

  generationActive = true;
  let conversation = null;
  const abort = () => {
    try {
      conversation?.cancel?.();
    } catch (error) {
      console.error("LiteRT-LM cancel failed", error);
    }
  };

  try {
    conversation = await engine.createConversation({
      preface: {
        messages: [{ role: "system", content: system }],
      },
    });
    activeConversation = conversation;
    if (signal?.aborted) {
      conversation.cancel?.();
      throw new DOMException("Cancelado", "AbortError");
    }
    signal?.addEventListener("abort", abort, { once: true });

    let output = "";
    const stream = conversation.sendMessageStreaming(user);
    for await (const chunk of stream) {
      if (signal?.aborted) {
        conversation.cancel?.();
        throw new DOMException("Cancelado", "AbortError");
      }
      for (const item of chunk.content || []) {
        if (item.type === "text" && item.text) {
          output += item.text;
          onToken?.(item.text, output);
        }
      }
    }
    return output;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw error;
    }
    console.error("LiteRT-LM generation failed", error);
    throw new Error("No se pudo generar con IA local. Se usara la respuesta determinista.");
  } finally {
    signal?.removeEventListener?.("abort", abort);
    if (activeConversation === conversation) activeConversation = null;
    generationActive = false;
  }
}

export function cancelLiteRtGeneration() {
  activeConversation?.cancel?.();
}

export async function disposeLiteRt() {
  try {
    activeConversation?.cancel?.();
    activeConversation = null;
    await engine?.delete?.();
  } finally {
    engine = null;
    loadPromise = null;
    generationActive = false;
  }
}

export const __litertEngineTest = {
  userMessageForError,
  reset() {
    engine = null;
    loadPromise = null;
    activeConversation = null;
    generationActive = false;
  },
};
