/**
 * حصص يومية لكل متصفح (localStorage). للضبط الحقيقي لاحقاً: خادم + حساب طالب.
 *
 * افتراضياً: دردشة 40، واجب/تلخيص/خطة/اختبر نفسي 10 لكل منها.
 * يمكن تجاوز أي قيمة بـ VITE_MAX_QUESTIONS_PER_DAY و VITE_MAX_HOMEWORK_SOLVES_PER_DAY إلخ.
 * يمكن تعطيل النظام فقط إذا لزم عبر: VITE_DISABLE_DAILY_QUOTAS=1
 */

export type DailyQuotaFeature = "chat" | "homework" | "summary" | "planner" | "selftest";

const DEFAULTS: Record<DailyQuotaFeature, number> = {
    chat: 40,
    homework: 10,
    summary: 10,
    planner: 10,
    selftest: 10,
};

const ENV_KEYS: Record<DailyQuotaFeature, string> = {
    chat: "VITE_MAX_QUESTIONS_PER_DAY",
    homework: "VITE_MAX_HOMEWORK_SOLVES_PER_DAY",
    summary: "VITE_MAX_SUMMARY_PER_DAY",
    planner: "VITE_MAX_PLANNER_PER_DAY",
    selftest: "VITE_MAX_SELFTEST_PER_DAY",
};

const LABELS: Record<DailyQuotaFeature, string> = {
    chat: "الدردشة الذكية",
    homework: "حل الواجب",
    summary: "التلخيص",
    planner: "الخطة الدراسية",
    selftest: "اختبر نفسي",
};

function envRaw(key: string): string | undefined {
    return (import.meta.env as Record<string, string | undefined>)[key];
}

function quotasPackEnabled(): boolean {
    const v = envRaw("VITE_DISABLE_DAILY_QUOTAS");
    return !(v === "1" || v === "true" || v === "yes");
}

/** الحد اليومي للميزة؛ 0 = بلا حد */
export function getDailyLimit(feature: DailyQuotaFeature): number {
    const key = ENV_KEYS[feature];
    const raw = envRaw(key);
    if (raw !== undefined && raw !== "") {
        const n = parseInt(String(raw), 10);
        if (Number.isFinite(n) && n >= 0) return n;
    }
    return quotasPackEnabled() ? DEFAULTS[feature] : 0;
}

function storageKey(feature: DailyQuotaFeature): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `solvica_quota_${feature}_${y}-${m}-${day}`;
}

export function getQuotaUsed(feature: DailyQuotaFeature): number {
    try {
        const c = parseInt(localStorage.getItem(storageKey(feature)) || "0", 10);
        return Number.isFinite(c) && c >= 0 ? c : 0;
    } catch {
        return 0;
    }
}

export function consumeQuota(feature: DailyQuotaFeature): void {
    const limit = getDailyLimit(feature);
    if (limit <= 0) return;
    try {
        localStorage.setItem(storageKey(feature), String(getQuotaUsed(feature) + 1));
    } catch {
        /* ignore */
    }
}

export function checkQuota(feature: DailyQuotaFeature): { ok: true } | { ok: false; message: string } {
    const limit = getDailyLimit(feature);
    if (limit <= 0) return { ok: true };
    const used = getQuotaUsed(feature);
    if (used >= limit) {
        return {
            ok: false,
            message: `وصلتَ للحد اليومي لـ «${LABELS[feature]}» (${limit} مرات). يُعاد العدّ تلقائياً مع يوم جديد حسب توقيت جهازك.`,
        };
    }
    return { ok: true };
}

/** متبقي اليوم (للعرض في الواجهة لاحقاً) */
export function getQuotaRemaining(feature: DailyQuotaFeature): number | null {
    const limit = getDailyLimit(feature);
    if (limit <= 0) return null;
    return Math.max(0, limit - getQuotaUsed(feature));
}
