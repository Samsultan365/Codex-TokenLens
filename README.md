# Codex TokenLens

涓€涓簿鑷村皬宸х殑 Codex 鏈湴鎻掍欢锛氬湪瀵硅瘽鍐呮煡鐪嬪綋鍓?**token 鐢ㄩ噺**銆?*涓婁笅鏂囧崰鐢?*銆?*棰濆害/閲嶇疆鏃堕棿**锛屽苟鎸夊綋鍓嶆ā鍨嬭嚜鍔ㄨ瘑鍒钩鍙版煡璇?**浣欓**锛圖eepSeek / OpenAI / OpenRouter / OpenAI-compatible锛夈€?
> 鏈」鐩槸绗笁鏂瑰伐鍏凤紝涓嶆槸 OpenAI 瀹樻柟浜у搧銆傛彃浠跺彧璇诲彇鏈満 Codex 鏁版嵁鍜屽彲閫夌殑鐜鍙橀噺瀵嗛挜锛屼笉涓婁紶浼氳瘽鍐呭銆?
## 瀹炴椂缃《灏忕粍浠?
濡傛灉浣犺鐨勬槸甯搁┗鍦ㄦ梺杈广€佽嚜鍔ㄥ埛鏂般€佷笉鐢ㄦ墦寮€缃戦〉鐨勬樉绀烘柟寮忥紝璇峰惎鍔細

```powershell
.\widget\CodexUsageWidget.ps1
```

鎴栫洿鎺ュ弻鍑伙細

```powershell
.\widget\Launch-Widget.vbs
```

灏忕粍浠剁壒鐐癸細

- 濮嬬粓缃《銆佹棤浠诲姟鏍忓浘鏍囥€佸彲鎷栧姩骞惰浣忎綅缃?- 姣?8 绉掑埛鏂帮紝骞跺皾璇曡创鍦?Codex 绐楀彛鏃佽竟
- 鏄剧ず鍐呭闈炲父鐩寸櫧锛氬綋鍓嶅璇濆悕銆佸凡鐢?token銆佷笂涓嬫枃鐧惧垎姣斻€佷綑棰?- 澶嶇敤鍚屼竴涓?Node 鏁版嵁灞傦紙`mcp/cli.mjs`锛夛紝涓?Codex 鎻掍欢缁撴灉涓€鑷?
## 褰撳墠鑳藉姏锛坴0.1 妗嗘灦锛?
- `codex_usage_panel`锛氭渶鏂扮嚎绋?token 鐢ㄩ噺 + 涓婁笅鏂囧崰鐢?+ rate-limit 鐘舵€?- `codex_balance_panel`锛氭寜骞冲彴鑷姩鏌ヨ浣欓
- `codex_usage_and_balance`锛氬悎骞舵樉绀轰竴寮犲唴鑱旈潰鏉?- `codex_usage_diagnostics`锛氭煡鐪嬭嚜鍔ㄨ瘑鍒粨鏋滀笌瀵嗛挜閰嶇疆鐘舵€侊紙瀵嗛挜鎵撶爜锛?
## 鐩綍缁撴瀯

```text
.
鈹溾攢鈹€ .agents/plugins/marketplace.json
鈹溾攢鈹€ plugins/codex-usage-panel/
鈹?  鈹溾攢鈹€ .codex-plugin/plugin.json
鈹?  鈹溾攢鈹€ .mcp.json
鈹?  鈹溾攢鈹€ mcp/
鈹?  鈹?  鈹溾攢鈹€ launcher.cmd
鈹?  鈹?  鈹溾攢鈹€ server.mjs
鈹?  鈹?  鈹斺攢鈹€ lib/
鈹?  鈹?      鈹溾攢鈹€ config.mjs
鈹?  鈹?      鈹溾攢鈹€ codex-source.mjs
鈹?  鈹?      鈹溾攢鈹€ render.mjs
鈹?  鈹?      鈹斺攢鈹€ adapters/
鈹?  鈹斺攢鈹€ skills/codex-usage-panel/SKILL.md
鈹溾攢鈹€ widget/\n鈹?  鈹溾攢鈹€ CodexUsageWidget.ps1\n鈹?  鈹斺攢鈹€ Launch-Widget.vbs\n鈹溾攢鈹€ docs/design.md
鈹斺攢鈹€ README.md
```

## 瀹夎

### 浠?GitHub 瀹夎 marketplace

```powershell
codex plugin marketplace add <浣犵殑浠撳簱 Git URL>
codex plugin list --marketplace codex-usage-panel-marketplace --available --json
codex plugin add codex-usage-panel --marketplace codex-usage-panel-marketplace
```

### 鏈湴瀹夎 marketplace

```powershell
codex plugin marketplace add "C:\path\to\codex-usage-panel"
codex plugin add codex-usage-panel --marketplace codex-usage-panel-marketplace
```

### 閰嶇疆浣欓瀵嗛挜

鎸夐渶璁剧疆鐜鍙橀噺锛屾彃浠朵笉浼氭妸瀵嗛挜鍐欒繘浠撳簱锛?
```powershell
$env:DEEPSEEK_API_KEY = "sk-..."
$env:OPENAI_API_KEY = "sk-..."
$env:OPENROUTER_API_KEY = "sk-or-..."
```

鐒跺悗鍦?Codex 瀵硅瘽涓鈥滄樉绀烘垜鐨?Codex 鐢ㄩ噺鍜屼綑棰濃€濄€?
## 鑷姩璇嗗埆瑙勫垯

- 妯″瀷鍚嶆垨 `base_url` 鍚?`deepseek` 鈫?DeepSeek
- `base_url` 鍚?`openrouter.ai` 鈫?OpenRouter
- `base_url` 鍚?`api.openai.com` / `openai.com`锛屾垨 `model_provider=openai` 涓旀棤 base_url 鈫?OpenAI
- 鍏朵綑 鈫?OpenAI-compatible

## DeepSeek / 鏈湴浠ｇ悊浣欓璇存槑

鎻掍欢榛樿瀵?DeepSeek 浣跨敤 `{origin}/user/balance`銆傚鏋?`base_url` 鏄湰鍦颁唬鐞嗭紙渚嬪 `http://127.0.0.1:15721/v1`锛変笖璇ヤ唬鐞嗘湭浠ｇ悊浣欓鎺ュ彛锛屾彃浠朵細缁欏嚭鏄庣‘鎻愮ず銆?
鍙€夋柟妗堬細

1. 璁剧疆鐪熷疄 DeepSeek Key 鍚庢煡璇㈠畼鏂逛綑棰濓細

```powershell
$env:DEEPSEEK_API_KEY = "sk-..."
```

2. 鑻ユ湰鍦颁唬鐞嗘毚闇蹭簡浣欓绔偣锛屽湪 `~/.codex/codex-usage-panel.config.json` 涓鐩栵細

```json
{
  "providers": {
    "deepseek": {
      "api_key_env": "DEEPSEEK_API_KEY",
      "balance_url": "http://127.0.0.1:15721/your-balance-path"
    }
  }
}
```

3. 涔熷彲浠ヤ娇鐢ㄧ幆澧冨彉閲?`DEEPSEEK_BALANCE_URL` 涓存椂瑕嗙洊銆?
## 鍙€夐厤缃?
鎶?`plugins/codex-usage-panel/codex-usage-panel.config.example.json` 澶嶅埗涓?`~/.codex/codex-usage-panel.config.json`锛屽彲瑕嗙洊瀵嗛挜鐜鍙橀噺鍚嶅拰浣欓鍦板潃銆?
## 鍙傝€冪殑鍚岀被椤圭洰

- [KNODEdev/codex-usage](https://github.com/KNODEdev/codex-usage)锛氭湰鍦?`token_count` 浜嬩欢 + MCP 宸ュ叿鐨?Codex 鎻掍欢
- [lllybxgs/codex-usage-widget](https://github.com/lllybxgs/codex-usage-widget)锛歁CP 鎻掍欢 + Windows 妗岄潰灏忕粍浠?- [Liuxiny/codex-usage-bar](https://github.com/Liuxiny/codex-usage-bar)锛氬畼鏂?App Server 涓?CC Switch 鏁版嵁婧愮殑鑷畾涔夌獥鍙?
## 鏁版嵁婧愪紭鍏堢骇

1. 瀹樻柟 App Server锛歚account/read`銆乣account/usage/read`銆乣account/rateLimits/read`
2. 鏈湴鍥為€€锛歚~/.codex/sessions/**/*.jsonl` 鐨勬渶鏂?`token_count`

濡傛灉 App Server 涓嶅彲鐢紙渚嬪褰撳墠 CLI 鏈繍琛屾湰鍦?daemon锛夛紝鎻掍欢浼氳嚜鍔ㄥ洖閫€鍒版湰鍦?JSONL锛屼笉浼氫腑鏂煡璇€?
## 宸茬煡闄愬埗

- Codex 鎻掍欢 manifest 鐩墠鍙毚闇?`skills` 涓?`mcpServers`锛屾棤娉曞祵鍏ュ師鐢熷父椹讳晶鏍忋€傛湰鎻掍欢閲囩敤鈥滃璇濆唴鍐呰仈鍗＄墖 + 鎸夐渶鍒锋柊鈥濄€?- OpenAI Platform 娌℃湁鍏紑鐨勪綑棰濇煡璇?API锛屾彃浠跺彧鍋?API Key 鏍￠獙骞舵彁绀哄墠寰€缃戦〉鏌ョ湅銆?- 褰撳墠鑷畾涔?provider锛堝鏈湴浠ｇ悊锛夎嫢涓嶄唬鐞嗕綑棰濇帴鍙ｏ紝闇€瑕佸崟鐙缃搴斿钩鍙扮殑 `*_API_KEY` 鎴栭厤缃?`balance_url`銆?
## CC Switch 鑷姩璇诲彇 DeepSeek 瀵嗛挜

濡傛灉绯荤粺宸插畨瑁?[CC Switch](https://github.com/cc-switch/cc-switch) 涓斿綋鍓?Codex provider 鏄?DeepSeek锛屾彃浠朵細浼樺厛浠?`~/.cc-switch/cc-switch.db` 鑷姩璇诲彇瀵嗛挜鐢ㄤ簬浣欓鏌ヨ銆傝杩囩▼鍙湪鏈満鍙戠敓锛屽瘑閽ヤ笉浼氬啓鍏ヤ粨搴撱€佹棩蹇楁垨鑱婂ぉ鍐呭銆?
## 闅愮

- 涓嶅啓鍏ユ垨涓婁紶浼氳瘽 JSONL 鍐呭銆?- 浣欓璇锋眰浠呭彂寰€璇嗗埆鍑虹殑骞冲彴绔偣銆?- 璇婃柇杈撳嚭浼氭妸瀵嗛挜鎵撶爜銆?






