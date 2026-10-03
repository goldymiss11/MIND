import { OrchestratorService } from "./packages/core/src/services/orchestrator.service.js";

async function main() {
  const o = new OrchestratorService();
  try {
    const res = await o.handleIncomingMessage("123456", "Мне нужно сдать отчет по проекту Альфа в эту пятницу");
    console.log("SUCCESS:", res);
  } catch(e) {
    console.error("ERROR:", e);
  }
}
main();
