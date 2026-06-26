## StatusEffect - 状态效果系统
## 中毒、灼烧、冰冻、感电等效果

extends RefCounted

enum Type {
	NONE,
	POISON,     # 持续毒伤
	BURN,       # 灼烧伤害
	FREEZE,     # 减速 + 定身
	SLOW,       # 减速
	SHOCK,      # 感电（增伤）
	STUN,       # 眩晕
	ARMOR_BREAK # 破甲
}

var type: Type = Type.NONE
var duration: float = 0.0
var tick_interval: float = 1.0
var tick_timer: float = 0.0
var value: float = 0.0          # 每秒伤害 / 减速百分比 / 增伤百分比
var remaining: float = 0.0
var stacks: int = 1
var max_stacks: int = 5

func _init(t: Type, dur: float, val: float, interval: float = 1.0):
	type = t
	duration = dur
	remaining = dur
	value = val
	tick_interval = interval

func tick(delta: float) -> bool:
	if remaining <= 0:
		return false   # 效果结束
	remaining -= delta
	tick_timer += delta
	if tick_timer >= tick_interval:
		tick_timer -= tick_interval
		return true   # 触发一次 tick
	return false

func refresh(new_duration: float, add_stack: bool = true) -> void:
	remaining = max(remaining, new_duration)
	if add_stack and stacks < max_stacks:
		stacks += 1

func is_expired() -> bool:
	return remaining <= 0
