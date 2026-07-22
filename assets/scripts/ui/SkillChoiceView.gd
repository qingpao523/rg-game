extends CanvasLayer

## SkillChoiceView - 升级三选一 UI
## 每次升级时弹出，显示三个可选技能

class_name SkillChoiceView

signal choice_made(skill_id: String)

var _skills: Array = []
var _picked_from_pool: bool = false

@onready var panel: Panel = $Panel
@onready var title_label: Label = $Panel/TitleLabel
@onready var card_container: VBoxContainer = $Panel/CardContainer

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_WHEN_PAUSED
	_apply_art_skin()
	hide()

func _apply_art_skin() -> void:
	panel.add_theme_stylebox_override("panel", UiArt.transparent_panel())
	var panel_art := UiArt.texture_rect("res://assets/art/ui/skill_evolution_prompt.tres", panel.size, TextureRect.STRETCH_SCALE)
	panel_art.name = "PanelArt"
	panel_art.set_anchors_preset(Control.PRESET_FULL_RECT)
	panel_art.offset_left = 0.0
	panel_art.offset_top = 0.0
	panel_art.offset_right = 0.0
	panel_art.offset_bottom = 0.0
	panel_art.modulate = Color(1, 1, 1, 0.94)
	panel.add_child(panel_art)
	panel.move_child(panel_art, 0)
	title_label.add_theme_color_override("font_color", Color(0.98, 0.9, 0.68, 1))

func show_choices(skills: Array) -> void:
	_skills = skills
	for child in card_container.get_children():
		child.queue_free()
	for i in range(min(3, skills.size())):
		var card = _create_skill_card(skills[i], i)
		card_container.add_child(card)
	title_label.text = "选择升级"
	show()

func _create_skill_card(skill_id: String, index: int) -> Panel:
	var is_upgrade = skill_id.ends_with(":upgrade")
	var actual_id = skill_id.trim_suffix(":upgrade")
	var cfg = SkillConfig.get_config(actual_id)
	var current_lv = GameSession.skill_level_map.get(actual_id, 0)
	var next_lv = current_lv + 1
	var tags = cfg.get("tags", [])
	var accent_color := _get_element_color(tags)

	var card = Panel.new()
	card.custom_minimum_size = Vector2(536, 160)
	card.size = Vector2(536, 160)
	card.clip_contents = true
	card.mouse_filter = Control.MOUSE_FILTER_PASS
	card.add_theme_stylebox_override("panel", _make_choice_card_style(accent_color))
	# 图标
	var icon_bg = ColorRect.new()
	icon_bg.size = Vector2(64, 64)
	icon_bg.position = Vector2(26, 34)
	icon_bg.color = accent_color
	var icon_rect := UiArt.skill_icon_rect(actual_id, Vector2(64, 64), TextureRect.STRETCH_KEEP_ASPECT_CENTERED)
	icon_rect.position = Vector2(26, 34)
	# 等级标签
	var lv_label = Label.new()
	if is_upgrade:
		lv_label.text = "Lv.%d → %d" % [current_lv, next_lv]
	else:
		lv_label.text = "Lv.1"
	lv_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	lv_label.position = Vector2(18, 104)
	lv_label.size = Vector2(80, 22)
	lv_label.add_theme_font_size_override("font_size", 14)
	lv_label.add_theme_color_override("font_color", Color(0.85, 0.85, 0.6, 1))
	# 名称
	var name_label = Label.new()
	name_label.text = cfg.get("name", actual_id)
	name_label.position = Vector2(116, 26)
	name_label.size = Vector2(270, 28)
	name_label.add_theme_font_size_override("font_size", 20)
	name_label.add_theme_color_override("font_color", Color(0.98, 0.92, 0.76, 1))
	# 描述
	var desc_label = Label.new()
	desc_label.text = cfg.get("description", "")
	desc_label.position = Vector2(116, 58)
	desc_label.size = Vector2(288, 48)
	desc_label.clip_text = true
	desc_label.autowrap_mode = TextServer.AUTOWRAP_WORD
	desc_label.add_theme_font_size_override("font_size", 12)
	desc_label.add_theme_color_override("font_color", Color(0.78, 0.75, 0.68, 1))
	# 标签
	var tags_str = " / ".join(tags)
	var tags_label = Label.new()
	tags_label.text = tags_str
	tags_label.position = Vector2(116, 112)
	tags_label.size = Vector2(260, 24)
	tags_label.clip_text = true
	tags_label.add_theme_font_size_override("font_size", 11)
	tags_label.add_theme_color_override("font_color", Color(0.62, 0.72, 0.95, 1))
	# 属性预览（升级时显示提升）
	var stat_label = Label.new()
	if is_upgrade:
		var dmg = cfg.get("damage_base", 0) + cfg.get("damage_per_level", 0) * (next_lv - 1)
		stat_label.text = "伤害: %d" % dmg
	else:
		stat_label.text = "新技能"
	stat_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	stat_label.position = Vector2(388, 36)
	stat_label.size = Vector2(118, 24)
	stat_label.add_theme_font_size_override("font_size", 11)
	stat_label.add_theme_color_override("font_color", Color(0.7, 0.9, 0.7, 1))
	# 选择按钮
	var button = Button.new()
	button.text = "选择"
	button.position = Vector2(390, 88)
	button.size = Vector2(120, 44)
	UiArt.apply_button_skin(button)
	button.pressed.connect(_on_choice_pressed.bind(skill_id, index))
	card.add_child(icon_bg)
	card.add_child(icon_rect)
	card.add_child(lv_label)
	card.add_child(name_label)
	card.add_child(desc_label)
	card.add_child(tags_label)
	card.add_child(stat_label)
	card.add_child(button)
	return card

static func _make_choice_card_style(accent_color: Color) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.025, 0.022, 0.018, 0.88)
	style.border_color = Color(accent_color.r, accent_color.g, accent_color.b, 0.86)
	style.set_border_width_all(2)
	style.set_corner_radius_all(12)
	style.content_margin_left = 12.0
	style.content_margin_top = 10.0
	style.content_margin_right = 12.0
	style.content_margin_bottom = 10.0
	return style

static func _get_element_color(tags: Array) -> Color:
	if "雷" in tags: return Color(0.3, 0.5, 1.0, 0.8)
	if "火" in tags: return Color(1.0, 0.3, 0.2, 0.8)
	if "召唤" in tags: return Color(0.6, 0.4, 0.8, 0.8)
	if "灾厄" in tags: return Color(0.5, 0.2, 0.6, 0.8)
	if "冰" in tags: return Color(0.2, 0.7, 1.0, 0.8)
	if "毒" in tags: return Color(0.2, 0.8, 0.3, 0.8)
	if "圣" in tags: return Color(1.0, 0.85, 0.2, 0.8)
	return Color(0.4, 0.4, 0.5, 0.8)

func _on_choice_pressed(skill_id: String, index: int) -> void:
	hide()
	EventBus.emit_signal("choice_made", index)
	emit_signal("choice_made", skill_id)
