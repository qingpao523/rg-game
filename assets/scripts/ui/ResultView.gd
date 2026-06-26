extends CanvasLayer

## ResultView - 结算界面
## 直接从 GameSession 读取数据（信号发射时本场景还未加载）

class_name ResultView

@onready var stats_container: VBoxContainer = $Panel/VBoxContainer/StatsContainer
@onready var title_label: Label = $Panel/VBoxContainer/TitleLabel
@onready var restart_button: Button = $Panel/VBoxContainer/RestartButton
@onready var menu_button: Button = $Panel/VBoxContainer/MenuButton

func _ready() -> void:
	restart_button.pressed.connect(_on_restart)
	menu_button.pressed.connect(_on_menu)
	_show_stats()

func _show_stats() -> void:
	var s = GameSession
	title_label.text = "战斗结束"
	# 清空旧统计
	for child in stats_container.get_children():
		child.queue_free()
	# 显示数据
	var data = [
		"存活波次：%d" % s.wave,
		"击杀数：%d" % s.kills,
		"最终等级：Lv.%d" % s.level,
		"存活时间：%02d:%02d" % [int(s.survival_time) / 60, int(s.survival_time) % 60]
	]
	for line in data:
		var label = Label.new()
		label.text = line
		label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		label.theme_override_font_sizes/font_size = 22
		label.theme_override_colors/font_color = Color(0.9, 0.9, 0.95, 1)
		stats_container.add_child(label)

func _on_restart() -> void:
	GameApp.start_game(GameSession.character_id)

func _on_menu() -> void:
	GameApp.return_to_menu()
