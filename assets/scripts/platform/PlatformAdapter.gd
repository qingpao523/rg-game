extends Node

## PlatformAdapter - 平台适配层
## 隔离所有平台特定 API（微信小游戏等），战斗系统不直接调用 wx

signal game_shown
signal game_hidden

enum Platform { DESKTOP, WECHAT, OTHER }

var current_platform: Platform = Platform.DESKTOP

func _ready() -> void:
	DisplayServer.screen_set_orientation(DisplayServer.SCREEN_PORTRAIT)
	_detect_platform()
	get_tree().root.focus_exited.connect(_on_focus_exited)
	get_tree().root.focus_entered.connect(_on_focus_entered)

func _detect_platform() -> void:
	# 微信小游戏检测
	if DisplayServer.get_name() == "wechat":
		current_platform = Platform.WECHAT
		print("[Platform] 微信小游戏平台")
	else:
		current_platform = Platform.DESKTOP
		print("[Platform] 桌面平台")

func save_data(key: String, value: Variant) -> void:
	match current_platform:
		Platform.DESKTOP:
			var file = FileAccess.open("user://%s.dat" % key, FileAccess.WRITE)
			if file:
				file.store_var(value)
		Platform.WECHAT:
			# 通过 JavaScript bridge 调用 wx.setStorageSync
			_save_to_wechat(key, value)
		_:
			push_warning("[Platform] 未实现的保存平台")

func load_data(key: String, default_value: Variant = null) -> Variant:
	match current_platform:
		Platform.DESKTOP:
			var file = FileAccess.open("user://%s.dat" % key, FileAccess.READ)
			if file:
				return file.get_var()
			return default_value
		Platform.WECHAT:
			return _load_from_wechat(key, default_value)
		_:
			return default_value

func _save_to_wechat(key: String, value: Variant) -> void:
	# 通过 JavaScript 接口调用
	var json_str = JSON.stringify(value)
	JavaScriptBridge.eval("wx.setStorageSync('%s', %s)" % [key, json_str])

func _load_from_wechat(key: String, default_value: Variant) -> Variant:
	var result = JavaScriptBridge.eval("wx.getStorageSync('%s')" % key, true)
	return result if result != null else default_value

func _on_focus_exited() -> void:
	emit_signal("game_hidden")

func _on_focus_entered() -> void:
	emit_signal("game_shown")

func vibrate_short() -> void:
	if current_platform == Platform.WECHAT:
		JavaScriptBridge.eval("wx.vibrateShort()")
