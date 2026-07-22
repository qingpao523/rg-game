# 《无尽入侵》Godot 美术资产清单与提示词 v1.0

## 末日档案神秘学 2D 俯视角风格

## 1. 美术总风格

### 风格名

**Apocalypse Archive Mythic 2D**

中文定义：

**末日档案神秘学 2D 俯视角风格**

### 视觉关键词

* 黑金灾厄
* 边境档案
* 预报终端
* 东方遗迹
* 神秘学符号
* 高亮元素特效
* 低饱和暗色地图
* 清晰剪影角色
* 可读性优先
* Godot 2D 资产友好

### 画面原则

地图要暗。
技能要亮。
角色要清楚。
怪物要有压迫感。
UI 要像异常处置档案。

---

## 2. 所有 AI 生成通用前缀

建议每条提示词前都加这段：

```text
apocalypse archive mythic style, prophetic dark fantasy mood, top-down 2D roguelike game asset, clean silhouette, readable at small size, stylized, dark low-saturation environment palette, high-contrast glowing magic, black gold disaster aesthetic, mysterious eastern and mythic fusion, game-ready for Godot 2D
```

## 3. 通用负面提示词

```text
no text, no watermark, no logo, no photorealism, no realistic photo, no complex background, no extra characters, no blurry details, no cropped body, no heavy perspective, no cinematic poster composition, no low contrast, no noisy texture, no messy silhouette
```

---

# 4. Godot 资产规格建议

| 资产类型       |               建议尺寸 | 背景     | 格式  | 备注           |
| ---------- | -----------------: | ------ | --- | ------------ |
| 角色单帧       |            256×256 | 透明     | PNG | 先做 idle 标准姿势 |
| 小怪单帧       |            128×128 | 透明     | PNG | 后续再拆动画       |
| 精英怪        |            256×256 | 透明     | PNG | 体型更大         |
| 技能图标       |            512×512 | 不透明或透明 | PNG | UI 可缩放       |
| 地面 Tile    |            256×256 | 不透明    | PNG | Seamless     |
| Overlay 裂纹 |  256×256 / 512×512 | 透明     | PNG | 叠加层          |
| 装饰物 Prop   |  256×256 / 512×512 | 透明     | PNG | 独立摆放         |
| VFX 单帧     |            512×512 | 透明     | PNG | 可做序列帧        |
| UI 面板      | 512×256 / 1024×512 | 透明     | PNG | 九宫格切片        |
| 按钮         |             256×96 | 透明     | PNG | 普通、悬停、按下     |

---

# 5. 角色资产提示词

## 5.1 道士：雷部敕令者

```text
top-down 2D game character, Taoist thunder exorcist, apocalypse archive mythic style, eastern talisman and thunder command theme, short dark robe with cinnabar patterns, talisman pouch, wooden sword and bronze command token, several yellow talismans floating behind the back, electric blue lightning glow, paper yellow and cinnabar red accents, clean readable silhouette, 3/4 top-down view, idle pose, transparent background, isolated character, game-ready sprite asset for Godot 2D
```

## 5.2 武士：断刃处刑人

```text
top-down 2D game character, samurai executioner, broken black haori, long katana larger than body, cold white blade glow, black white and blood red palette, battle-worn clothing, sharp slash motif, fast dangerous silhouette, 3/4 top-down view, idle pose, transparent background, isolated character, stylized dark fantasy sprite asset for Godot 2D
```

## 5.3 法老：冥棺役王

```text
top-down 2D game character, pharaoh necromancer, funerary mysticism, gold death mask, small floating sarcophagus behind the back, ritual staff, sand gold and underworld purple palette, dark purple aura, black sand trail around feet, clean silhouette, readable at small size, 3/4 top-down idle pose, transparent background, isolated character, Godot 2D sprite asset
```

## 5.4 寒冰女巫：冻原见证者

```text
top-down 2D game character, frost witch, apocalypse archive style, long cloak, floating ice ring behind, ice crystal details on hair and sleeves, icy blue and silver white palette, subtle frost mist, calm dangerous posture, clean silhouette, readable at small size, 3/4 top-down view, transparent background, isolated character, game-ready sprite for Godot 2D
```

## 5.5 十字军：圣柜封锁者

```text
top-down 2D game character, crusader shield bearer, holy containment warrior, oversized tower shield covering forty percent of body silhouette, white and gold armor, iron gray trim, sacred engraved markings, heavy defensive silhouette, 3/4 top-down idle pose, transparent background, isolated character, stylized dark fantasy game asset for Godot 2D
```

---

# 6. 怪物资产提示词

## 6.1 裂界残民

```text
top-down 2D enemy sprite, borderland husk, ghostly human remnant twisted by apocalypse corruption, hollow face, torn clothes, dark gray translucent body, faint black gold cracks, weak but unsettling silhouette, readable at small size, transparent background, isolated enemy, game-ready Godot 2D asset
```

## 6.2 断角龙卒

```text
top-down 2D enemy sprite, broken horn draconic charger, corrupted ancient court soldier, forward leaning body, broken horn helmet, black red energy trail, aggressive fast unit silhouette, readable at small size, transparent background, isolated enemy, stylized Godot 2D roguelike asset
```

## 6.3 司灾铜像

```text
top-down 2D elite enemy sprite, disaster bronze colossus, awakened ritual statue, oxidized bronze armor, glowing black gold crack in chest, massive heavy silhouette, ancient court guardian corrupted by borderland disaster, transparent background, isolated elite enemy, readable at small size, Godot 2D game asset
```

## 6.4 秘藏哥布林

```text
top-down 2D treasure goblin enemy sprite, borderland scavenger, small fast creature carrying oversized loot sack, coins talismans and glowing crystals leaking from the bag, mischievous frantic posture, gold highlights, clean silhouette, transparent background, isolated game-ready asset for Godot 2D
```

---

# 7. 地图与场景资产提示词

## 7.1 破碎龙庭地面 Tile

```text
seamless top-down 2D ground tile, broken dragon court ruins, dark stone floor, cracked ancient tiles, subtle ritual patterns, low saturation blue gray and charcoal palette, faint black gold corruption lines, readable but not noisy, no perspective, tileable texture, game-ready Godot 2D tileset
```

## 7.2 黑金裂纹 Overlay

```text
seamless top-down 2D overlay texture, black gold corruption cracks, borderland disaster fissures, subtle glowing lines, transparent background, tileable, clean edges, low noise, for Godot 2D environment overlay
```

## 7.3 龙骨装饰物

```text
top-down 2D environment prop, giant dragon bone fragment, ancient ivory bone, weathered and cracked, faint black gold corruption glow, half buried in broken stone floor, stylized game prop, transparent background, isolated, Godot 2D asset
```

## 7.4 青铜祭坛

```text
top-down 2D environment prop, ancient bronze ritual altar, oxidized bronze, engraved disaster runes, dark gold highlights, corrupted by black purple energy, broken court ruin style, transparent background, isolated prop, Godot 2D game asset
```

## 7.5 破碎宫墙

```text
top-down 2D environment prop, broken palace wall fragment, ancient eastern court ruins, dark stone and worn gold trim, cracked and collapsed, subtle corruption marks, transparent background, isolated prop, readable at game scale, Godot 2D
```

## 7.6 黑雾边缘

```text
top-down 2D fog overlay, dark border mist, black purple haze, low opacity drifting edges, ominous apocalypse boundary effect, transparent background, isolated VFX layer, tileable or repeatable, Godot 2D asset
```

---

# 8. UI 资产提示词

## 8.1 主 UI 面板

```text
2D game UI panel, apocalypse archive interface, dark metallic and black paper texture, gold trim, disaster report aesthetic, sacred document mood, clean rectangular panel, no text, transparent background, game-ready UI element for Godot
```

## 8.2 升级三选一卡牌

```text
2D roguelike upgrade card UI, mystical apocalypse archive style, dark panel with gold frame, subtle rune engraving, premium magical document look, no text, transparent background, clean layout, game-ready card asset for Godot
```

## 8.3 主动技按钮

```text
2D circular skill button UI, dark gold apocalypse archive style, glowing rim, empty center for icon placement, clean readable shape, no text, transparent background, Godot 2D UI asset
```

## 8.4 技能槽

```text
2D skill slot UI frame, dark metal square with gold trim, subtle disaster rune details, clean small readable frame, no text, transparent background, Godot 2D UI asset
```

## 8.5 职业头像框

```text
2D character portrait frame, apocalypse archive style, dark gold ornamental frame, subtle mystical runes, clean silhouette, no text, transparent background, suitable for character selection UI in Godot
```

## 8.6 结算报告面板

```text
2D result report UI panel, disaster archive document style, dark parchment and black metal frame, gold lines, official emergency report aesthetic, no text, clean layout, transparent background, Godot 2D UI asset
```

---

# 9. VFX 资产提示词

## 9.1 敕令雷符

```text
2D visual effect asset, thunder seal spell, yellow talisman flying forward and opening into blue electric rune circle, vertical lightning strike, eastern mystic thunder style, high contrast, transparent background, isolated, clean edges, game-ready VFX for Godot 2D
```

## 9.2 一闪

```text
2D visual effect asset, samurai flash slash, white blade arc with blood red trailing cut mark, fast horizontal dash slash shape, sharp clean motion, transparent background, isolated, stylized action VFX for Godot 2D
```

## 9.3 冥棺敕命

```text
2D visual effect asset, necromantic sarcophagus command, dark purple sand vortex pulling spirits inward, ancient sarcophagus opening burst, gold and underworld purple glow, transparent background, isolated, game-ready VFX for Godot
```

## 9.4 极寒领域

```text
2D visual effect asset, frozen field area spell, circular frost field with hexagonal ice patterns, icy blue aura, frost mist, outer ring cracking and shattering, transparent background, isolated, clean area VFX for Godot 2D
```

## 9.5 圣盾冲阵

```text
2D visual effect asset, holy shield charge, wedge shaped golden push wave, white gold shield glow, impact burst at the end, sacred forceful motion, transparent background, isolated, stylized Godot 2D VFX
```

---

# 10. 技能图标统一提示词骨架

每个图标都可以在前面加：

```text
square skill icon, dark fantasy roguelike UI icon, apocalypse archive style, centered symbol, dark background, glowing subject, clean silhouette, readable at small size, high contrast, no text, no watermark
```

通用负面：

```text
no letters, no words, no watermark, no realistic hand, no character portrait, no messy background, no low contrast
```

---

# 11. 第一批最优先生成资产

建议你先生成这 20 个，够你立住 Demo 美术风格：

## 角色

1. 道士
2. 武士
3. 法老
4. 寒冰女巫
5. 十字军

## 怪物

6. 裂界残民
7. 断角龙卒
8. 司灾铜像
9. 秘藏哥布林

## 场景

10. 破碎龙庭地面 Tile
11. 黑金裂纹 Overlay
12. 龙骨装饰物
13. 青铜祭坛
14. 黑雾边缘

## UI

15. 升级卡牌
16. 技能槽
17. 主动技按钮
18. 结算报告面板

## VFX

19. 敕令雷符
20. 一闪
