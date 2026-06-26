## WaveConfig - 波次配置
## 8-12 分钟压缩压力曲线

class_name WaveConfig
extends RefCounted

static var _wave_templates: Array[Dictionary] = [
	# 前 3 波：暖身
	{"wave": 1, "duration": 30, "spawns": [{"type": "grunt", "count": 3, "interval": 2.0}]},
	{"wave": 2, "duration": 30, "spawns": [{"type": "grunt", "count": 5, "interval": 1.5}]},
	{"wave": 3, "duration": 30, "spawns": [{"type": "grunt", "count": 4, "interval": 1.2}, {"type": "charger", "count": 2, "interval": 3.0}]},
	# 4-6 波：上强度
	{"wave": 4, "duration": 35, "spawns": [{"type": "grunt", "count": 6, "interval": 1.0}, {"type": "charger", "count": 3, "interval": 2.5}]},
	{"wave": 5, "duration": 35, "spawns": [{"type": "grunt", "count": 8, "interval": 0.8}, {"type": "charger", "count": 4, "interval": 2.0}]},
	{"wave": 6, "duration": 40, "spawns": [{"type": "grunt", "count": 10, "interval": 0.7}, {"type": "elite", "count": 1, "interval": 8.0}]},
	# 7-9 波：高压
	{"wave": 7, "duration": 40, "spawns": [{"type": "grunt", "count": 12, "interval": 0.5}, {"type": "charger", "count": 6, "interval": 1.5}, {"type": "elite", "count": 1, "interval": 6.0}]},
	{"wave": 8, "duration": 45, "spawns": [{"type": "grunt", "count": 15, "interval": 0.4}, {"type": "charger", "count": 8, "interval": 1.2}, {"type": "elite", "count": 2, "interval": 5.0}]},
	{"wave": 9, "duration": 45, "spawns": [{"type": "grunt", "count": 18, "interval": 0.3}, {"type": "charger", "count": 10, "interval": 1.0}, {"type": "elite", "count": 3, "interval": 4.0}]},
	# 10+：混沌
	{"wave": 10, "duration": 60, "spawns": [{"type": "grunt", "count": 25, "interval": 0.2}, {"type": "charger", "count": 12, "interval": 0.8}, {"type": "elite", "count": 4, "interval": 3.0}]}
]

static func load_data() -> void:
	print("[WaveConfig] 已加载 ", _wave_templates.size(), " 个波次模板")

static func get_wave_template(wave: int) -> Dictionary:
	for tmpl in _wave_templates:
		if tmpl.wave == wave:
			return tmpl.duplicate(true)
	# 10 波以后复用第 10 波模板并加成
	var base = _wave_templates[-1].duplicate(true)
	for s in base.spawns:
		s.count = int(s.count * (1.0 + (wave - 10) * 0.2))
		s.interval = max(0.1, s.interval * (1.0 - (wave - 10) * 0.05))
	return base

static func get_max_wave() -> int:
	return _wave_templates.size()
