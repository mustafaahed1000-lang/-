import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = "AIzaSyCX-pf42zk0oH5jg5-iJJCyNt3_wBKpUXI";

async function run() {
    try {
        console.log("Fetching available models...");
        const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models?key=" + apiKey);
        const data = await response.json();
        console.log("AVAILABLE MODELS:");
        data.models.forEach(m => console.log(m.name));
    } catch (e) {
        console.error("ERROR:", e);
    }
}

run();
