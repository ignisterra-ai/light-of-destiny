// i18n.js - 多語言系統主控檔案
// 會自動載入 common.js 和當前頁面的翻譯檔案

class I18n {
    constructor() {
        this.currentLang = this.getStoredLanguage() || this.detectLanguage();
        this.translations = {};
        this.loadedPages = new Set();
    }

    // 偵測瀏覽器語言
    detectLanguage() {
        const browserLang = navigator.language || navigator.userLanguage;
        
        if (browserLang.startsWith('zh')) {
            if (browserLang.includes('CN') || browserLang.includes('Hans')) {
                return 'zh-cn';
            }
            return 'zh';
        } else if (browserLang.startsWith('ja')) {
            return 'ja';
        } else if (browserLang.startsWith('ru')) {
            return 'ru';
        } else if (browserLang.startsWith('es')) {
            return 'es';
        }
        
        return 'en';
    }

    // 從 localStorage 取得儲存的語言
    getStoredLanguage() {
        return localStorage.getItem('language');
    }

    // 儲存語言到 localStorage
    setStoredLanguage(lang) {
        localStorage.setItem('language', lang);
    }

    // 載入翻譯檔案(合併 common + 頁面專用)
    async loadTranslations(page) {
        try {
            // 1. 先載入 common.js(如果還沒載入)
            if (!this.loadedPages.has('common')) {
                const commonScript = document.createElement('script');
                commonScript.src = 'i18n/common.js';
                await new Promise((resolve, reject) => {
                    commonScript.onload = resolve;
                    commonScript.onerror = reject;
                    document.head.appendChild(commonScript);
                });
                
                // 合併 common 翻譯
                if (window.commonTranslations) {
                    this.mergeTranslations(window.commonTranslations);
                    this.loadedPages.add('common');
                }
            }

            // 2. 載入頁面專用翻譯(如果還沒載入)
            if (!this.loadedPages.has(page)) {
                const pageScript = document.createElement('script');
                pageScript.src = `i18n/${page}.js`;
                await new Promise((resolve, reject) => {
                    pageScript.onload = resolve;
                    pageScript.onerror = () => {
                        console.warn(`Page translations for ${page} not found, using common only`);
                        resolve();
                    };
                    document.head.appendChild(pageScript);
                });
                
                // 合併頁面翻譯
                const pageTranslationsVar = `${page}Translations`;
                if (window[pageTranslationsVar]) {
                    this.mergeTranslations(window[pageTranslationsVar]);
                    this.loadedPages.add(page);
                }
            }

            return true;
        } catch (error) {
            console.error(`Failed to load translations:`, error);
            return false;
        }
    }

    // 合併翻譯物件
    mergeTranslations(newTranslations) {
        for (const lang in newTranslations) {
            if (!this.translations[lang]) {
                this.translations[lang] = {};
            }
            Object.assign(this.translations[lang], newTranslations[lang]);
        }
    }

    // 取得翻譯文字
    t(key) {
        const value = this.translations[this.currentLang]?.[key] || 
                     this.translations['en']?.[key] || 
                     key;
        return value;
    }

    // 更新頁面上所有的翻譯文字
    updatePageContent(withAnimation = false) {
        const elements = document.querySelectorAll('[data-i18n], [data-i18n-html]');

        if (withAnimation && elements.length > 0) {
            // 添加淡出效果
            elements.forEach(el => {
                el.style.transition = 'opacity 0.2s ease-out';
                el.style.opacity = '0';
            });

            // 等待淡出完成後更新內容
            setTimeout(() => {
                this.updateTranslations();

                // 淡入效果
                setTimeout(() => {
                    elements.forEach(el => {
                        el.style.opacity = '1';
                    });

                    // 清除 transition 避免影響其他動畫
                    setTimeout(() => {
                        elements.forEach(el => {
                            el.style.transition = '';
                        });
                    }, 200);
                }, 50);
            }, 200);
        } else {
            this.updateTranslations();
        }

        // 更新 HTML lang 屬性
        document.documentElement.lang = this.currentLang;
    }

    // 實際更新翻譯的內部方法
    updateTranslations() {
        // 更新所有有 data-i18n 屬性的元素
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.t(key);

            // 檢查是否有特殊屬性需要翻譯
            const attr = element.getAttribute('data-i18n-attr');
            if (attr) {
                element.setAttribute(attr, translation);
            } else {
                element.textContent = translation;
            }
        });

        // 更新所有有 data-i18n-html 屬性的元素(支援 HTML 內容)
        document.querySelectorAll('[data-i18n-html]').forEach(element => {
            const key = element.getAttribute('data-i18n-html');
            element.innerHTML = this.t(key);
        });
    }

    // 切換語言
    async changeLanguage(lang) {
        this.currentLang = lang;
        this.setStoredLanguage(lang);
        this.updatePageContent(true); // 啟用動畫效果

        // 更新語言選擇器的值
        const selector = document.getElementById('languageSelect');
        if (selector) {
            selector.value = lang;
        }

        // 觸發自定義事件
        window.dispatchEvent(new CustomEvent('languageChanged', {
            detail: { language: lang }
        }));
    }

    // 初始化
    async init(page = 'index') {
        // 載入翻譯檔案
        await this.loadTranslations(page);
        
        // 更新頁面內容
        this.updatePageContent();
        
        // 設置語言選擇器
        const selector = document.getElementById('languageSelect');
        if (selector) {
            selector.value = this.currentLang;
            selector.addEventListener('change', (e) => {
                this.changeLanguage(e.target.value);
            });
        }
    }
}

// 創建全局實例
window.i18n = new I18n();

// 當 DOM 載入完成後初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // 從檔名判斷當前頁面
        const page = window.location.pathname.split('/').pop().replace('.html', '') || 'index';
        window.i18n.init(page);
    });
} else {
    // DOM 已經載入完成
    const page = window.location.pathname.split('/').pop().replace('.html', '') || 'index';
    window.i18n.init(page);
}
