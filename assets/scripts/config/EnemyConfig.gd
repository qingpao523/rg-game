## EnemyConfig - 怪物配置 v2.1（平衡版）
## 敌人 HP/伤害 随波次快速增长

class_name EnemyConfig
extends RefCounted

static var _configs: Dictionary = {
	"grunt": {
		"name": "杂兵",
		"description": "基础近战怪物",
		"hp": 20,
		"hp_per_wave": 10,
		"damage": 8,
		"damage_per_wave": 3,
		"move_speed": 80.0,
		"exp_reward": 3,
		"exp_per_wave": 1,
		"attack_range": 20.0,
		"attack_cooldown": 1.0,
		"collision_radius": 12.0,
		"is_ranged": false,
		"visual_scale": 0.052
	},
	"charger": {
		"name": "冲锋兵",
		"description": "快速冲锋怪物",
		"hp": 15,
		"hp_per_wave": 8,
		"damage": 12,
		"damage_per_wave": 4,
		"move_speed": 160.0,
		"exp_reward": 5,
		"exp_per_wave": 1,
		"attack_range": 15.0,
		"attack_cooldown": 1.5,
		"collision_radius": 10.0,
		"is_ranged": false,
		"charge_speed_multiplier": 2.5,
		"charge_duration": 0.8,
		"visual_scale": 0.052
	},
	"elite": {
		"name": "精英",
		"description": "高血量高伤害精英怪",
		"hp": 80,
		"hp_per_wave": 30,
		"damage": 20,
		"damage_per_wave": 8,
		"move_speed": 60.0,
		"exp_reward": 20,
		"exp_per_wave": 5,
		"attack_range": 25.0,
		"attack_cooldown": 1.2,
		"collision_radius": 16.0,
		"is_ranged": false,
		"scale": 1.5,
		"visual_scale": 0.058
	},
	"ranger": {
		"name": "射手怪",
		"description": "远程射击怪物",
		"hp": 12,
		"hp_per_wave": 6,
		"damage": 6,
		"damage_per_wave": 3,
		"move_speed": 50.0,
		"exp_reward": 4,
		"exp_per_wave": 1,
		"attack_range": 300.0,
		"attack_cooldown": 2.0,
		"collision_radius": 10.0,
		"is_ranged": true,
		"projectile_speed": 300,
		"projectile_texture": "res://assets/art/projectiles/magic_missile.tres",
		"art_key": "grunt",
		"visual_scale": 0.052
	}
}

static func load_data() -> void:
	print("[EnemyConfig] 已加载 ", _configs.size(), " 个怪物类型")

static func get_all_ids() -> Array[String]:
	return _configs.keys()

static func get_config(id: String) -> Dictionary:
	return _configs.get(id, {}).duplicate(true)
