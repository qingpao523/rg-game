extends Resource

## SkillInstance - 技能运行时实例
## 存储单个技能的运行时状态

class_name SkillInstance

enum SkillCategory { BASE, EVOLVED, ACTIVE_ABILITY }

var skill_id: String
var category: SkillCategory = SkillCategory.BASE
var level: int = 1
var cooldown_timer: float = 0.0
var config: Dictionary = {}
var owner: Node = null

func _init(id: String, cfg: Dictionary, owner_node: Node, cat: SkillCategory = SkillCategory.BASE):
	skill_id = id
	config = cfg
	owner = owner_node
	category = cat

func is_ready() -> bool:
	return cooldown_timer <= 0.0

func reset_cooldown() -> void:
	var cd = config.get("cooldown", 1.0)
	cd += config.get("cooldown_per_level", 0.0) * (level - 1)
	cooldown_timer = max(0.5, cd)

func tick(delta: float) -> void:
	if cooldown_timer > 0:
		cooldown_timer -= delta

func get_damage() -> int:
	var base = config.get("damage_base", 0)
	var per_level = config.get("damage_per_level", 0)
	return base + per_level * (level - 1)

func get_range() -> float:
	return config.get("range", 300.0)
