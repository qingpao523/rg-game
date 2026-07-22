extends Node

## GameSession - 单局游戏会话
## 保存本局所有运行时状态，不持久化

## --- 运行时状态 ---
var character_id: String = ""
var level: int = 1
var experience: int = 0
var experience_to_next: int = 10
var health: float = 100.0
var max_health: float = 100.0
var mana: float = 50.0
var max_mana: float = 50.0
var kills: int = 0
var wave: int = 1
var survival_time: float = 0.0
var acquired_skills: Array[Dictionary] = []    # [{id, level, slot_index}]
var active_skill_id: String = ""

## --- 职业基础属性（从配置加载后填充）---
var base_stats: Dictionary = {}
var passive_effects: Array = []

## --- 临时战斗修正 ---
var damage_multiplier: float = 1.0
var defense_multiplier: float = 1.0
var move_speed_bonus: float = 0.0
var attack_speed_bonus: float = 0.0

## --- 技能触发统计（用于进化检测）---
var skill_level_map: Dictionary = {}   # skill_id -> current_level

## --- 经验曲线常量 ---
const EARLY_EXP: Array[int] = [10, 20, 40, 80, 150]
const EXP_GROWTH: float = 1.2

func _init() -> void:
	reset()

func get_required_exp_for_level(target_level: int) -> int:
	if target_level <= EARLY_EXP.size() + 1:
		return EARLY_EXP[target_level - 2]
	var base = EARLY_EXP.back()
	var diff = target_level - (EARLY_EXP.size() + 1)
	return int(base * pow(EXP_GROWTH, diff))

func reset() -> void:
	character_id = ""
	level = 1
	experience = 0
	experience_to_next = 20
	health = 100.0
	max_health = 100.0
	mana = 50.0
	max_mana = 50.0
	kills = 0
	wave = 1
	survival_time = 0.0
	acquired_skills.clear()
	active_skill_id = ""
	base_stats.clear()
	passive_effects.clear()
	damage_multiplier = 1.0
	defense_multiplier = 1.0
	move_speed_bonus = 0.0
	attack_speed_bonus = 0.0
	skill_level_map.clear()

func start_new(char_id: String) -> void:
	reset()
	character_id = char_id
	var cfg = CharacterConfig.get_config(char_id)
	if cfg:
		base_stats = cfg.duplicate(true)
		max_health = base_stats.get("hp", 100)
		health = max_health
		max_mana = base_stats.get("mana", 50)
		mana = max_mana
		experience_to_next = base_stats.get("exp_to_level", 20)
		move_speed_bonus = base_stats.get("move_speed", 200.0)
		passive_effects = base_stats.get("passives", []).duplicate(true)
		active_skill_id = base_stats.get("active_skill_id", "")
		print("[GameSession] 开局: ", char_id)

func add_experience(amount: int) -> bool:
	experience += amount
	EventBus.emit_signal("experience_gained", amount, experience, experience_to_next)
	var leveled_up = false
	while experience >= experience_to_next:
		experience -= experience_to_next
		level += 1
		experience_to_next = get_required_exp_for_level(level + 1)
		max_health += 10.0
		health = min(health + 20.0, max_health)
		max_mana += 5.0
		mana = min(mana + 10.0, max_mana)
		leveled_up = true
		EventBus.emit_signal("player_leveled_up", level)
	return leveled_up

func add_kill() -> void:
	kills += 1

func add_skill(skill_id: String, level: int = 1) -> bool:
	var cfg = SkillConfig.get_config(skill_id)
	var is_passive = cfg.get("passive", false)
	# 被动技能不占技能栏，但记入 skill_level_map
	if not is_passive:
		if acquired_skills.size() >= 6:
			return false
		var slot = acquired_skills.size()
		acquired_skills.append({"id": skill_id, "level": level, "slot_index": slot})
	skill_level_map[skill_id] = level
	EventBus.emit_signal("skill_acquired", skill_id, level)
	return true

func upgrade_skill(skill_id: String) -> bool:
	if not skill_level_map.has(skill_id):
		return false
	var new_lv = skill_level_map[skill_id] + 1
	if new_lv > 6:
		return false
	skill_level_map[skill_id] = new_lv
	for s in acquired_skills:
		if s.id == skill_id:
			s.level = new_lv
			break
	EventBus.emit_signal("skill_upgraded", skill_id, new_lv)
	return true

func take_damage(amount: float, source: Node = null) -> void:
	var final_damage = max(1, int(amount * defense_multiplier))
	health -= final_damage
	EventBus.emit_signal("player_damaged", final_damage, source)
	if health <= 0:
		health = 0
		EventBus.emit_signal("player_died")

func heal(amount: float) -> void:
	var healed = min(amount, max_health - health)
	health += healed
	EventBus.emit_signal("player_healed", int(healed))
