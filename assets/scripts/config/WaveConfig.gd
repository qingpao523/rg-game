## WaveConfig - 波次配置
## 8-12 分钟压缩压力曲线

class_name WaveConfig
extends RefCounted

static var _wave_templates: Array[Dictionary] = [
	# 前 3 波：快速暖身
	{"wave": 1, "duration": 20, "spawns": [{"type": "grunt", "count": 16, "interval": 0.9}]},
	{"wave": 2, "duration": 20, "spawns": [{"type": "grunt", "count": 24, "interval": 0.7}]},
	{"wave": 3, "duration": 20, "spawns": [{"type": "grunt", "count": 16, "interval": 0.5}, {"type": "charger", "count": 8, "interval": 1.5}]},
	# 4-6 波：上强度
	{"wave": 4, "duration": 25, "spawns": [{"type": "grunt", "count": 20, "interval": 0.5}, {"type": "charger", "count": 10, "interval": 1.5}]},
	{"wave": 5, "duration": 25, "spawns": [{"type": "grunt", "count": 24, "interval": 0.4}, {"type": "charger", "count": 12, "interval": 1.2}]},
	{"wave": 6, "duration": 30, "spawns": [{"type": "grunt", "count": 28, "interval": 0.3}, {"type": "elite", "count": 4, "interval": 5.0}]},
	# 7-9 波：高压
	{"wave": 7, "duration": 35, "spawns": [{"type": "grunt", "count": 36, "interval": 0.25}, {"type": "charger", "count": 16, "interval": 1.0}, {"type": "elite", "count": 4, "interval": 4.0}]},
	{"wave": 8, "duration": 35, "spawns": [{"type": "grunt", "count": 44, "interval": 0.2}, {"type": "charger", "count": 20, "interval": 0.8}, {"type": "elite", "count": 6, "interval": 3.0}]},
	{"wave": 9, "duration": 40, "spawns": [{"type": "grunt", "count": 56, "interval": 0.15}, {"type": "charger", "count": 24, "interval": 0.6}, {"type": "elite", "count": 8, "interval": 2.5}]},
	# 10+：混沌
	{"wave": 10, "duration": 50, "spawns": [{"type": "grunt", "count": 70, "interval": 0.1}, {"type": "charger", "count": 30, "interval": 0.5}, {"type": "elite", "count": 12, "interval": 2.0}]}
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
