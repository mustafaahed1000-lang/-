import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = "AIzaSyCX-pf42zk0oH5jg5-iJJCyNt3_wBKpUXI";
const genAI = new GoogleGenerativeAI(apiKey);

async function run() {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("Hello");
        console.log("gemini-1.5-flash OK:", result.response.text());
    } catch (e) {
        console.error("gemini-1.5-flash ERROR:", e.message);
    }

    try {
        const model2 = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
        const result2 = await model2.generateContent("Hello");
        console.log("gemini-1.5-pro OK:", result2.response.text());
    } catch (e) {
        console.error("gemini-1.5-pro ERROR:", e.message);
    }

    try {
        const model3 = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result3 = await model3.generateContent("Hello");
        console.log("gemini-pro OK:", result3.response.text());
    } catch (e) {
        console.error("gemini-pro ERROR:", e.message);
    }
}

run();
