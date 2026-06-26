## Damage - 伤害计算工具
## 集中处理所有伤害公式

extends RefCounted

enum DamageType {
	PHYSICAL,     # 物理
	MAGIC,        # 魔法
	TRUE_DAMAGE,  # 真实伤害
	FIRE,         # 火焰
	ICE,          # 冰霜
	LIGHTNING,    # 闪电
	POISON,       # 毒素
	HOLY          # 神圣
}

static func calculate(base: float, type: DamageType, attacker_stats: Dictionary = {}, defender_stats: Dictionary = {}) -> float:
	var dmg = base
	match type:
		DamageType.TRUE_DAMAGE:
			pass   # 无视防御
		DamageType.PHYSICAL:
			var defense = defender_stats.get("defense", 0)
			dmg = max(1, dmg * (100.0 / (100.0 + defense)))
		_:
			var resistance = defender_stats.get("resistance", 0)
			dmg = max(1, dmg * (100.0 / (100.0 + resistance)))
	# 暴击
	if attacker_stats.get("crit", false):
		var crit_dmg = attacker_stats.get("crit_damage", 1.5)
		dmg *= crit_dmg
	return dmg

static func apply_element_bonus(base_damage: float, target_effects: Array) -> float:
	var bonus = 1.0
	for effect in target_effects:
		if effect.type == StatusEffect.Type.SHOCK:
			bonus += 0.2 * effect.stacks   # 每层感电 +20% 雷系伤害
	return base_damage * bonus

static func is_critical(crit_rate: float) -> bool:
	return randf() < crit_rate
