import { generateGemma4, GemmaError } from "../src/model/gemma-client.js";

try {
  const result = await generateGemma4([{ text: "Reply with the single word OK." }]);
  // Intentionally do not print model-generated text or credentials.
  console.log(JSON.stringify({
    liveRequestCompleted: true,
    requestedModel: result.requestedModel,
    returnedModel: result.returnedModel,
    responseReceived: result.text.length > 0,
    scope: "Text connectivity only; screenshot extraction is not tested.",
  }, null, 2));
} catch (error) {
  console.error(JSON.stringify({
    liveRequestCompleted: false,
    code: error instanceof GemmaError ? error.code : "MODEL_UNAVAILABLE",
    message: error instanceof GemmaError ? error.message : "Unexpected request failure.",
  }, null, 2));
  process.exitCode = 1;
}
