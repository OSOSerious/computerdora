"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiService = exports.AIService = void 0;
var groq_sdk_1 = require("groq-sdk");
var store_1 = require("svelte/store");
var readline = require("readline/promises");
// Create a Groq client with the provided API key
var groq = new groq_sdk_1.default({
    apiKey: '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'
});
var AIService = /** @class */ (function () {
    function AIService() {
        // Store for conversation history
        this.conversationHistory = (0, store_1.writable)([
            {
                role: 'system',
                content: 'You are a helpful AI assistant that provides context-aware insights about the user\'s screen and cursor interactions.'
            }
        ]);
    }
    // Chat method with enhanced error handling and streaming support
    AIService.prototype.chat = function (userMessage_1) {
        return __awaiter(this, arguments, void 0, function (userMessage, options) {
            var _a, model, _b, temperature, _c, maxTokens, messages_1, chatCompletion, assistantResponse_1, error_1;
            var _d, _e;
            if (options === void 0) { options = {}; }
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        _a = options.model, model = _a === void 0 ? 'llama3-8b-8192' : _a, _b = options.temperature, temperature = _b === void 0 ? 0.7 : _b, _c = options.maxTokens, maxTokens = _c === void 0 ? 1024 : _c;
                        _f.label = 1;
                    case 1:
                        _f.trys.push([1, 3, , 4]);
                        // Update conversation history
                        this.conversationHistory.update(function (history) { return __spreadArray(__spreadArray([], history, true), [
                            { role: 'user', content: userMessage }
                        ], false); });
                        this.conversationHistory.subscribe(function (history) { messages_1 = history; })();
                        return [4 /*yield*/, groq.chat.completions.create({
                                messages: messages_1,
                                model: model,
                                temperature: temperature,
                                max_tokens: maxTokens
                            })];
                    case 2:
                        chatCompletion = _f.sent();
                        assistantResponse_1 = ((_e = (_d = chatCompletion.choices[0]) === null || _d === void 0 ? void 0 : _d.message) === null || _e === void 0 ? void 0 : _e.content) || '';
                        // Update conversation history with assistant's response
                        this.conversationHistory.update(function (history) { return __spreadArray(__spreadArray([], history, true), [
                            { role: 'assistant', content: assistantResponse_1 }
                        ], false); });
                        return [2 /*return*/, assistantResponse_1];
                    case 3:
                        error_1 = _f.sent();
                        console.error('Groq API Error:', error_1);
                        return [2 /*return*/, 'Sorry, I encountered an error processing your request.'];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    // Extract contextual information about the current screen and cursor
    AIService.prototype.extractContextualInfo = function () {
        return __awaiter(this, void 0, void 0, function () {
            var screenState, contextPrompt, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, this.getScreenState()];
                    case 1:
                        screenState = _a.sent();
                        contextPrompt = "\n        Analyze the following screen context:\n        - Timestamp: ".concat(screenState.timestamp, "\n        - Cursor Position: (").concat(screenState.cursorPosition.x, ", ").concat(screenState.cursorPosition.y, ")\n        - Active Window: ").concat(screenState.activeWindow, "\n        - Screen Content Snippet: ").concat(screenState.screenContent, "\n\n        Provide a concise, insightful summary of the context, highlighting any potential areas of interest or actionable insights.\n      ");
                        return [4 /*yield*/, this.chat(contextPrompt, {
                                temperature: 0.5,
                                maxTokens: 256
                            })];
                    case 2: return [2 /*return*/, _a.sent()];
                    case 3:
                        error_2 = _a.sent();
                        console.error('Context extraction error:', error_2);
                        return [2 /*return*/, 'Unable to extract contextual information.'];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    // Simulate getting screen state (replace with actual implementation)
    AIService.prototype.getScreenState = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, {
                        timestamp: Date.now(),
                        cursorPosition: { x: 0, y: 0 },
                        activeWindow: 'Unknown',
                        screenContent: 'No content captured'
                    }];
            });
        });
    };
    // Generate market research insights based on screen content
    AIService.prototype.generateMarketResearch = function (content) {
        return __awaiter(this, void 0, void 0, function () {
            var researchPrompt;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        researchPrompt = "\n      Perform a market research analysis on the following content:\n      ".concat(content, "\n\n      Provide insights including:\n      - Potential market trends\n      - Competitive landscape\n      - Emerging opportunities\n      - Potential challenges\n    ");
                        return [4 /*yield*/, this.chat(researchPrompt, {
                                temperature: 0.7,
                                maxTokens: 512
                            })];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    // Clear conversation history
    AIService.prototype.clearHistory = function () {
        this.conversationHistory.set([
            {
                role: 'system',
                content: 'You are a helpful AI assistant that provides context-aware insights about the user\'s screen and cursor interactions.'
            }
        ]);
    };
    return AIService;
}());
exports.AIService = AIService;
// Export a singleton instance
exports.aiService = new AIService();
function startCLI() {
    return __awaiter(this, void 0, void 0, function () {
        var rl, answer, response, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    rl = readline.createInterface({ input: process.stdin, output: process.stdout });
                    _a.label = 1;
                case 1:
                    if (!true) return [3 /*break*/, 7];
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 5, , 6]);
                    return [4 /*yield*/, rl.question('> ')];
                case 3:
                    answer = _a.sent();
                    if (answer.toLowerCase() === 'exit') {
                        return [3 /*break*/, 7];
                    }
                    return [4 /*yield*/, exports.aiService.chat(answer)];
                case 4:
                    response = _a.sent();
                    console.log(response);
                    return [3 /*break*/, 6];
                case 5:
                    error_3 = _a.sent();
                    console.error('CLI Error:', error_3);
                    return [3 /*break*/, 7];
                case 6: return [3 /*break*/, 1];
                case 7:
                    rl.close();
                    return [2 /*return*/];
            }
        });
    });
}
if (require.main === module) {
    startCLI();
}
