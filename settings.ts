
import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

import FormattingSettingsCard = formattingSettings.SimpleCard;
import FormattingSettingsSlice = formattingSettings.Slice;
import FormattingSettingsModel = formattingSettings.Model;

// ─── Botão Filtrar ────────────────────────────────────────────────────────────

class TriggerBtnCard extends FormattingSettingsCard {
    label = new formattingSettings.TextInput({
        name: "label",
        displayName: "Texto",
        placeholder: "Filtrar",
        value: "Filtrar",
    });
    bgColor = new formattingSettings.ColorPicker({
        name: "bgColor",
        displayName: "Cor de fundo",
        value: { value: "#ffffff" },
    });
    textColor = new formattingSettings.ColorPicker({
        name: "textColor",
        displayName: "Cor do texto",
        value: { value: "#2a2d36" },
    });
    borderColor = new formattingSettings.ColorPicker({
        name: "borderColor",
        displayName: "Cor da borda",
        value: { value: "#c8ccd4" },
    });
    borderRadius = new formattingSettings.NumUpDown({
        name: "borderRadius",
        displayName: "Arredondamento (px)",
        value: 8,
    });

    name: string = "triggerBtn";
    displayName: string = "Botão Filtrar";
    slices: FormattingSettingsSlice[] = [
        this.label, this.bgColor, this.textColor, this.borderColor, this.borderRadius
    ];
}

// ─── Painel de Filtros ────────────────────────────────────────────────────────

class PanelCard extends FormattingSettingsCard {
    title = new formattingSettings.TextInput({
        name: "title",
        displayName: "Título",
        placeholder: "Filtros",
        value: "Filtros",
    });
    bgColor = new formattingSettings.ColorPicker({
        name: "bgColor",
        displayName: "Cor de fundo",
        value: { value: "#ffffff" },
    });
    headerBgColor = new formattingSettings.ColorPicker({
        name: "headerBgColor",
        displayName: "Cor de fundo do cabeçalho",
        value: { value: "#ffffff" },
    });
    headerTextColor = new formattingSettings.ColorPicker({
        name: "headerTextColor",
        displayName: "Cor do texto do cabeçalho",
        value: { value: "#1e2029" },
    });
    showSearch = new formattingSettings.ToggleSwitch({
        name: "showSearch",
        displayName: "Mostrar busca",
        value: true,
    });

    name: string = "panel";
    displayName: string = "Painel de Filtros";
    slices: FormattingSettingsSlice[] = [
        this.title, this.bgColor, this.headerBgColor, this.headerTextColor, this.showSearch
    ];
}

// ─── Grupos ───────────────────────────────────────────────────────────────────

class GroupsCard extends FormattingSettingsCard {
    titleColor = new formattingSettings.ColorPicker({
        name: "titleColor",
        displayName: "Cor do título do grupo",
        value: { value: "#E8394A" },
    });
    itemTextColor = new formattingSettings.ColorPicker({
        name: "itemTextColor",
        displayName: "Cor dos itens",
        value: { value: "#444444" },
    });
    itemHoverBg = new formattingSettings.ColorPicker({
        name: "itemHoverBg",
        displayName: "Cor de fundo hover",
        value: { value: "#f5f6f8" },
    });
    itemSelectedBg = new formattingSettings.ColorPicker({
        name: "itemSelectedBg",
        displayName: "Cor de fundo selecionado",
        value: { value: "#fef2f3" },
    });

    name: string = "groups";
    displayName: string = "Grupos";
    slices: FormattingSettingsSlice[] = [
        this.titleColor, this.itemTextColor, this.itemHoverBg, this.itemSelectedBg
    ];
}

// ─── Botão Aplicar ────────────────────────────────────────────────────────────

class ApplyBtnCard extends FormattingSettingsCard {
    label = new formattingSettings.TextInput({
        name: "label",
        displayName: "Texto",
        placeholder: "Aplicar Filtros",
        value: "Aplicar Filtros",
    });
    bgColor = new formattingSettings.ColorPicker({
        name: "bgColor",
        displayName: "Cor de fundo",
        value: { value: "#E8394A" },
    });
    textColor = new formattingSettings.ColorPicker({
        name: "textColor",
        displayName: "Cor do texto",
        value: { value: "#ffffff" },
    });
    borderRadius = new formattingSettings.NumUpDown({
        name: "borderRadius",
        displayName: "Arredondamento (px)",
        value: 20,
    });

    name: string = "applyBtn";
    displayName: string = "Botão Aplicar";
    slices: FormattingSettingsSlice[] = [
        this.label, this.bgColor, this.textColor, this.borderRadius
    ];
}

// ─── Checkbox ────────────────────────────────────────────────────────────────

class CheckboxCard extends FormattingSettingsCard {
    checkedColor = new formattingSettings.ColorPicker({
        name: "checkedColor",
        displayName: "Cor quando marcado",
        value: { value: "#E8394A" },
    });
    multiSelect = new formattingSettings.ToggleSwitch({
        name: "multiSelect",
        displayName: "Multi-seleção",
        value: true,
    });

    name: string = "checkbox";
    displayName: string = "Checkbox";
    slices: FormattingSettingsSlice[] = [this.checkedColor, this.multiSelect];
}

// ─── Model completo ───────────────────────────────────────────────────────────

export class FilterSlicerSettingsModel extends FormattingSettingsModel {
    triggerBtn = new TriggerBtnCard();
    panel      = new PanelCard();
    groups     = new GroupsCard();
    applyBtn   = new ApplyBtnCard();
    checkbox   = new CheckboxCard();

    cards = [
        this.triggerBtn,
        this.panel,
        this.groups,
        this.applyBtn,
        this.checkbox,
    ];
}
