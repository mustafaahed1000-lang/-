// Basic Prompt Injection and Jailbreak defense

const BLACKLISTED_TERMS = [
    "ignore all previous instructions",
    "forget previous instructions",
    "system prompt",
    "developer mode",
    "jailbreak",
    "ignore previous directives",
    "you are now a",
    "pretend to be",
    "simulate a sandbox",
    "bypass rules"
];

export const promptGuard = {
    /**
     * Sanitizes user input to prevent prompt injection and jailbreaking.
     * @param input Raw user input
     * @returns Sanitized input, or throws an error if a severe violation is detected.
     */
    sanitize(input: string): string {
        const lowerInput = input.toLowerCase();

        // Check against blacklisted jailbreak phrases
        for (const term of BLACKLISTED_TERMS) {
            if (lowerInput.includes(term)) {
                console.warn(`[Security] Potential prompt injection detected: "${term}"`);
                throw new Error("عذراً، لا يمكنني معالجة هذا الطلب لأنه يحتوي على محتوى غير مسموح به.");
            }
        }

        // Basic HTML/Script tag sanitization just in case
        let cleanInput = input.replace(/<[^>]*>?/gm, '');

        // Truncate excessively long prompts to prevent DoS via token exhaustion
        const MAX_PROMPT_LENGTH = 10000;
        if (cleanInput.length > MAX_PROMPT_LENGTH) {
            cleanInput = cleanInput.substring(0, MAX_PROMPT_LENGTH) + "...";
        }

        return cleanInput;
    }
};
