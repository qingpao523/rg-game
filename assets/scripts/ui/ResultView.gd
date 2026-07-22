extends CanvasLayer

## ResultView - 结算界面
## 直接从 GameSession 读取数据（信号发射时本场景还未加载）

class_name ResultView

@onready var stats_container: VBoxContainer = $Panel/VBoxContainer/StatsContainer
@onready var title_label: Label = $Panel/VBoxContainer/TitleLabel
@onready var restart_button: Button = $Panel/VBoxContainer/RestartButton
@onready var menu_button: Button = $Panel/VBoxContainer/MenuButton

func _ready() -> void:
	_apply_art_skin()
	restart_button.pressed.connect(_on_restart)
	menu_button.pressed.connect(_on_menu)
	_show_stats()

func _apply_art_skin() -> void:
	var bg := UiArt.texture_rect("res://assets/art/menu/main_menu_bg.png", Vector2(720, 1280), TextureRect.STRETCH_KEEP_ASPECT_COVERED)
	bg.name = "ResultBgArt"
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	bg.offset_left = 0.0
	bg.offset_top = 0.0
	bg.offset_right = 0.0
	bg.offset_bottom = 0.0
	bg.modulate = Color(0.42, 0.42, 0.48, 1)
	$Panel.add_child(bg)
	$Panel.move_child(bg, 0)
	$Panel.add_theme_stylebox_override("panel", UiArt.transparent_panel())
	var report := UiArt.texture_rect("res://assets/art/ui/result_report_panel.tres", Vector2(620, 560), TextureRect.STRETCH_SCALE)
	report.name = "ResultReportArt"
	report.anchor_left = 0.5
	report.anchor_top = 0.5
	report.anchor_right = 0.5
	report.anchor_bottom = 0.5
	report.offset_left = -310.0
	report.offset_top = -280.0
	report.offset_right = 310.0
	report.offset_bottom = 280.0
	$Panel.add_child(report)
	$Panel.move_child(report, 1)
	UiArt.apply_button_skin(restart_button)
	UiArt.apply_button_skin(menu_button)
	title_label.add_theme_color_override("font_color", Color(0.98, 0.9, 0.72, 1))

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
		label.add_theme_font_size_override("font_size", 22)
		label.add_theme_color_override("font_color", Color(0.9, 0.9, 0.95, 1))
		stats_container.add_child(label)

func _on_restart() -> void:
	var cid = GameSession.character_id
	GameSession.reset()
	GameApp.start_game(cid)

func _on_menu() -> void:
	GameSession.reset()
	GameApp.return_to_menu()
