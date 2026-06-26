extends Node

## TimeService - 时间管理服务
## 处理游戏时间、暂停恢复和 delta 缩放，确保切后台时时间不偷跑

var game_time: float = 0.0      # 全局游戏时间（秒）
var paused: bool = false
var _delta_scale: float = 1.0

signal time_paused
signal time_resumed

func reset() -> void:
	game_time = 0.0
	paused = false
	_delta_scale = 1.0

func pause() -> void:
	if not paused:
		paused = true
		emit_signal("time_paused")

func resume() -> void:
	if paused:
		paused = false
		emit_signal("time_resumed")

func process(delta: float) -> void:
	if not paused:
		var scaled_delta = delta * _delta_scale
		game_time += scaled_delta

func get_elapsed() -> float:
	return game_time

func get_elapsed_formatted() -> String:
	var total = int(game_time)
	var minutes = total / 60
	var seconds = total % 60
	return "%02d:%02d" % [minutes, seconds]
