## EnemyConfig - 怪物配置
## 基础近战怪、冲锋怪、精英怪

extends Node

static var _configs: Dictionary = {
	"grunt": {
		"name": "杂兵",
		"description": "基础近战怪物",
		"hp": 20,
		"hp_per_wave": 5,
		"damage": 8,
		"damage_per_wave": 2,
		"move_speed": 80.0,
		"exp_reward": 3,
		"exp_per_wave": 1,
		"attack_range": 20.0,
		"attack_cooldown": 1.0,
		"collision_radius": 12.0
	},
	"charger": {
		"name": "冲锋兵",
		"description": "快速冲锋怪物",
		"hp": 15,
		"hp_per_wave": 3,
		"damage": 12,
		"damage_per_wave": 3,
		"move_speed": 160.0,
		"exp_reward": 5,
		"exp_per_wave": 1,
		"attack_range": 15.0,
		"attack_cooldown": 1.5,
		"collision_radius": 10.0,
		"charge_speed_multiplier": 2.5,
		"charge_duration": 0.8
	},
	"elite": {
		"name": "精英",
		"description": "高血量高伤害精英怪",
		"hp": 80,
		"hp_per_wave": 20,
		"damage": 20,
		"damage_per_wave": 5,
		"move_speed": 60.0,
		"exp_reward": 20,
		"exp_per_wave": 5,
		"attack_range": 25.0,
		"attack_cooldown": 1.2,
		"collision_radius": 16.0,
		"scale": 1.5
	}
}

static func load_data() -> void:
	print("[EnemyConfig] 已加载 ", _configs.size(), " 个怪物类型")

static func get_all_ids() -> Array[String]:
	return _configs.keys()

static func get_config(id: String) -> Dictionary:
	return _configs.get(id, {}).duplicate(true)
