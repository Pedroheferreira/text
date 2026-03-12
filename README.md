# text

"use strict";

import powerbi from "powerbi-visuals-api";
import DataView = powerbi.DataView;
import IVisual = powerbi.extensibility.visual.IVisual;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import ISelectionManager = powerbi.extensibility.ISelectionManager;
import ISelectionId = powerbi.visuals.ISelectionId;
import DataViewCategoryColumn = powerbi.DataViewCategoryColumn;

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface FieldGroup {
    name: string;
    items: FieldItem[];
    catRef: DataViewCategoryColumn;
    isExpanded: boolean;
}

interface FieldItem {
    label: string;
    selectionId: ISelectionId;
    selected: boolean;
    fieldName: string;
}

interface VisualSettings {
    triggerLabel: string;
    triggerBg: string;
    triggerTextColor: string;
    triggerBorderColor: string;
    triggerBorderRadius: number;
    panelTitle: string;
    panelBg: string;
    panelHeaderBg: string;
    panelHeaderText: string;
    showSearch: boolean;
    groupTitleColor: string;
    itemTextColor: string;
    itemHoverBg: string;
    itemSelectedBg: string;
    applyLabel: string;
    applyBg: string;
    applyTextColor: string;
    applyBorderRadius: number;
    checkboxCheckedColor: string;
    multiSelect: boolean;
}

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULTS: VisualSettings = {
    triggerLabel: "Filtrar",
    triggerBg: "#ffffff",
    triggerTextColor: "#2a2d36",
    triggerBorderColor: "#c8ccd4",
    triggerBorderRadius: 8,
    panelTitle: "Filtros",
    panelBg: "#ffffff",
    panelHeaderBg: "#ffffff",
    panelHeaderText: "#1e2029",
    showSearch: true,
    groupTitleColor: "#E8394A",
    itemTextColor: "#444444",
    itemHoverBg: "#f5f6f8",
    itemSelectedBg: "#fef2f3",
    applyLabel: "Aplicar Filtros",
    applyBg: "#E8394A",
    applyTextColor: "#ffffff",
    applyBorderRadius: 20,
    checkboxCheckedColor: "#E8394A",
    multiSelect: true,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function colorVal(obj: any, prop: string, fallback: string): string {
    return obj?.[prop]?.solid?.color ?? fallback;
}

function numVal(obj: any, prop: string, fallback: number): number {
    const v = obj?.[prop];
    return (v !== undefined && v !== null) ? Number(v) : fallback;
}

function strVal(obj: any, prop: string, fallback: string): string {
    const v = obj?.[prop];
    return (v !== undefined && v !== null && String(v).trim() !== "") ? String(v) : fallback;
}

function boolVal(obj: any, prop: string, fallback: boolean): boolean {
    const v = obj?.[prop];
    return v !== undefined ? Boolean(v) : fallback;
}

// ─── Visual ──────────────────────────────────────────────────────────────────

export class Visual implements IVisual {
    private host: IVisualHost;
    private selectionManager: ISelectionManager;
    private rootEl: HTMLElement;

    private groups: FieldGroup[] = [];
    private settings: VisualSettings = { ...DEFAULTS };
    private isExpanded: boolean = false;

    private expandedState: Map<string, boolean> = new Map();
    private selectedKeys: Set<string> = new Set();

    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        this.selectionManager = this.host.createSelectionManager();

        this.rootEl = document.createElement("div");
        this.rootEl.className = "fs-root";
        options.element.appendChild(this.rootEl);

        this.injectStyles();
    }

    public update(options: VisualUpdateOptions): void {
        const dv = options.dataViews?.[0];
        this.readSettings(dv);
        this.groups = this.parseFields(dv);
        this.render();
    }

    private readSettings(dv: DataView): void {
        const o = dv?.metadata?.objects ?? {};
        const s = this.settings;

        const tb  = o["triggerBtn"] as any;
        const pan = o["panel"]      as any;
        const grp = o["groups"]     as any;
        const abt = o["applyBtn"]   as any;
        const chk = o["checkbox"]   as any;

        s.triggerLabel        = strVal(tb,  "label",            DEFAULTS.triggerLabel);
        s.triggerBg           = colorVal(tb,"bgColor",          DEFAULTS.triggerBg);
        s.triggerTextColor    = colorVal(tb,"textColor",        DEFAULTS.triggerTextColor);
        s.triggerBorderColor  = colorVal(tb,"borderColor",      DEFAULTS.triggerBorderColor);
        s.triggerBorderRadius = numVal(tb,  "borderRadius",     DEFAULTS.triggerBorderRadius);

        s.panelTitle          = strVal(pan,  "title",           DEFAULTS.panelTitle);
        s.panelBg             = colorVal(pan,"bgColor",         DEFAULTS.panelBg);
        s.panelHeaderBg       = colorVal(pan,"headerBgColor",   DEFAULTS.panelHeaderBg);
        s.panelHeaderText     = colorVal(pan,"headerTextColor", DEFAULTS.panelHeaderText);
        s.showSearch          = boolVal(pan, "showSearch",      DEFAULTS.showSearch);

        s.groupTitleColor     = colorVal(grp,"titleColor",      DEFAULTS.groupTitleColor);
        s.itemTextColor       = colorVal(grp,"itemTextColor",   DEFAULTS.itemTextColor);
        s.itemHoverBg         = colorVal(grp,"itemHoverBg",     DEFAULTS.itemHoverBg);
        s.itemSelectedBg      = colorVal(grp,"itemSelectedBg",  DEFAULTS.itemSelectedBg);

        s.applyLabel          = strVal(abt,  "label",           DEFAULTS.applyLabel);
        s.applyBg             = colorVal(abt,"bgColor",         DEFAULTS.applyBg);
        s.applyTextColor      = colorVal(abt,"textColor",       DEFAULTS.applyTextColor);
        s.applyBorderRadius   = numVal(abt,  "borderRadius",    DEFAULTS.applyBorderRadius);

        s.checkboxCheckedColor = colorVal(chk,"checkedColor",   DEFAULTS.checkboxCheckedColor);
        s.multiSelect          = boolVal(chk, "multiSelect",    DEFAULTS.multiSelect);
    }

    private parseFields(dv: DataView): FieldGroup[] {
        const result: FieldGroup[] = [];
        if (!dv?.categorical?.categories) return result;

        dv.categorical.categories.forEach((cat) => {
            const fieldName = String(cat.source?.displayName ?? "Sem nome");
            const seen = new Set<string>();
            const items: FieldItem[] = [];

            cat.values.forEach((val, idx) => {
                const label = val != null ? String(val) : "(Em branco)";
                if (seen.has(label)) return;
                seen.add(label);

                const key = `${fieldName}||${label}`;
                const selectionId = this.host
                    .createSelectionIdBuilder()
                    .withCategory(cat, idx)
                    .createSelectionId();

                items.push({ label, selectionId, fieldName, selected: this.selectedKeys.has(key) });
            });

            items.sort((a, b) => a.label.localeCompare(b.label));

            const isExpanded = this.expandedState.has(fieldName)
                ? this.expandedState.get(fieldName)!
                : result.length === 0;

            result.push({ name: fieldName, items, catRef: cat, isExpanded });
        });

        return result;
    }

    private render(): void {
        this.rootEl.innerHTML = "";
        const s = this.settings;

        this.rootEl.style.background = s.panelBg;

        if (!this.isExpanded) {
            this.rootEl.appendChild(this.buildTriggerButton());
        } else {
            this.rootEl.appendChild(this.buildTriggerButton());
            this.rootEl.appendChild(this.buildPanel());
        }
    }

    private buildTriggerButton(): HTMLButtonElement {
        const s = this.settings;
        const btn = document.createElement("button");
        btn.className = "fs-trigger-btn";
        btn.style.cssText = `
            background: ${s.triggerBg};
            color: ${s.triggerTextColor};
            border-color: ${s.triggerBorderColor};
            border-radius: ${s.triggerBorderRadius}px;
        `;

        const icon = document.createElement("span");
        icon.className = "fs-trigger-icon";
        icon.innerHTML = "<span></span><span></span><span></span>";

        const label = document.createElement("span");
        label.textContent = s.triggerLabel;

        const badge = document.createElement("span");
        badge.className = "fs-badge" + (this.selectedKeys.size > 0 ? " visible" : "");
        badge.textContent = String(this.selectedKeys.size);
        badge.style.background = s.checkboxCheckedColor;

        const chevron = document.createElement("span");
        chevron.className = "fs-chevron" + (this.isExpanded ? " open" : "");
        chevron.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2.8" stroke-linecap="round">
            <polyline points="6 9 12 15 18 9"/></svg>`;

        btn.appendChild(icon);
        btn.appendChild(label);
        btn.appendChild(badge);
        btn.appendChild(chevron);

        btn.addEventListener("click", () => {
            this.isExpanded = !this.isExpanded;
            this.render();
        });

        return btn;
    }

    private buildPanel(): HTMLElement {
        const s = this.settings;

        const panel = document.createElement("div");
        panel.className = "fs-panel";
        panel.style.background = s.panelBg;

        const header = document.createElement("div");
        header.className = "fs-header";
        header.style.background = s.panelHeaderBg;

        const title = document.createElement("span");
        title.className = "fs-header-title";
        title.textContent = s.panelTitle;
        title.style.color = s.panelHeaderText;

        const closeBtn = document.createElement("button");
        closeBtn.className = "fs-header-close";
        closeBtn.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2.8" stroke-linecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/></svg>`;
        closeBtn.addEventListener("click", () => {
            this.isExpanded = false;
            this.render();
        });

        header.appendChild(title);
        header.appendChild(closeBtn);
        panel.appendChild(header);

        if (s.showSearch) panel.appendChild(this.buildSearch());

        const groupsEl = document.createElement("div");
        groupsEl.className = "fs-groups";

        if (this.groups.length === 0) {
            const empty = document.createElement("div");
            empty.className = "fs-empty";
            empty.textContent = "Adicione campos no painel de dados →";
            groupsEl.appendChild(empty);
        } else {
            this.groups.forEach(g => groupsEl.appendChild(this.buildGroup(g)));
        }

        panel.appendChild(groupsEl);

        const applyBtn = document.createElement("button");
        applyBtn.className = "fs-apply-btn";
        applyBtn.textContent = s.applyLabel;
        applyBtn.style.cssText = `
            background: ${s.applyBg};
            color: ${s.applyTextColor};
            border-radius: ${s.applyBorderRadius}px;
        `;
        applyBtn.addEventListener("click", () => this.applyFilters());
        panel.appendChild(applyBtn);

        return panel;
    }

    private buildSearch(): HTMLElement {
        const wrapper = document.createElement("div");
        wrapper.className = "fs-search-wrapper";
        wrapper.innerHTML = `<span class="fs-search-icon">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg></span>`;

        const input = document.createElement("input");
        input.type = "text";
        input.className = "fs-search-input";
        input.placeholder = "Buscar filtros...";

        input.addEventListener("input", () => {
            const q = input.value.toLowerCase();
            const groupsEl = this.rootEl.querySelector(".fs-groups") as HTMLElement;
            if (!groupsEl) return;
            groupsEl.innerHTML = "";
            this.groups.forEach(group => {
                if (q) {
                    const filtered: FieldGroup = {
                        ...group,
                        items: group.items.filter(i => i.label.toLowerCase().includes(q)),
                        isExpanded: true,
                    };
                    if (filtered.items.length > 0) groupsEl.appendChild(this.buildGroup(filtered));
                } else {
                    groupsEl.appendChild(this.buildGroup(group));
                }
            });
        });

        wrapper.appendChild(input);
        return wrapper;
    }

    private buildGroup(group: FieldGroup): HTMLElement {
        const s = this.settings;

        const groupEl = document.createElement("div");
        groupEl.className = "fs-group";

        const groupHeader = document.createElement("div");
        groupHeader.className = "fs-group-header";

        const groupTitle = document.createElement("span");
        groupTitle.className = "fs-group-title";
        groupTitle.textContent = group.name;
        groupTitle.style.color = s.groupTitleColor;

        const selectedCount = group.items.filter(i => i.selected).length;
        if (selectedCount > 0) {
            const dot = document.createElement("span");
            dot.className = "fs-group-dot";
            dot.style.background = s.checkboxCheckedColor;
            groupTitle.appendChild(dot);
        }

        const toggle = document.createElement("span");
        toggle.className = "fs-group-toggle";
        toggle.textContent = group.isExpanded ? "−" : "+";

        groupHeader.appendChild(groupTitle);
        groupHeader.appendChild(toggle);

        const itemList = document.createElement("div");
        itemList.className = "fs-item-list" + (group.isExpanded ? "" : " collapsed");

        group.items.forEach(item => itemList.appendChild(this.buildItem(item, s)));

        groupHeader.addEventListener("click", () => {
            group.isExpanded = !group.isExpanded;
            this.expandedState.set(group.name, group.isExpanded);
            itemList.classList.toggle("collapsed", !group.isExpanded);
            toggle.textContent = group.isExpanded ? "−" : "+";
        });

        groupEl.appendChild(groupHeader);
        groupEl.appendChild(itemList);
        return groupEl;
    }

    private buildItem(item: FieldItem, s: VisualSettings): HTMLElement {
        const itemEl = document.createElement("div");
        itemEl.className = "fs-item" + (item.selected ? " selected" : "");
        if (item.selected) itemEl.style.background = s.itemSelectedBg;

        const checkbox = document.createElement("span");
        checkbox.className = "fs-checkbox";
        this.renderCheckbox(checkbox, item.selected, s.checkboxCheckedColor);

        const label = document.createElement("span");
        label.className = "fs-item-label";
        label.textContent = item.label;
        label.style.color = s.itemTextColor;

        itemEl.appendChild(checkbox);
        itemEl.appendChild(label);

        itemEl.addEventListener("mouseenter", () => {
            if (!item.selected) itemEl.style.background = s.itemHoverBg;
        });
        itemEl.addEventListener("mouseleave", () => {
            itemEl.style.background = item.selected ? s.itemSelectedBg : "transparent";
        });

        itemEl.addEventListener("click", () => {
            const key = `${item.fieldName}||${item.label}`;

            if (!s.multiSelect) {
                const parentGroup = this.groups.find(g => g.name === item.fieldName);
                parentGroup?.items.forEach(i => {
                    i.selected = false;
                    this.selectedKeys.delete(`${i.fieldName}||${i.label}`);
                });
                itemEl.parentElement?.querySelectorAll(".fs-item").forEach(el => {
                    (el as HTMLElement).style.background = "transparent";
                    el.classList.remove("selected");
                    this.renderCheckbox(
                        el.querySelector(".fs-checkbox") as HTMLElement,
                        false, s.checkboxCheckedColor
                    );
                });
            }

            item.selected = !item.selected;
            if (item.selected) {
                this.selectedKeys.add(key);
                itemEl.classList.add("selected");
                itemEl.style.background = s.itemSelectedBg;
            } else {
                this.selectedKeys.delete(key);
                itemEl.classList.remove("selected");
                itemEl.style.background = "transparent";
            }

            this.renderCheckbox(checkbox, item.selected, s.checkboxCheckedColor);
            this.updateBadge();
        });

        return itemEl;
    }

    private renderCheckbox(el: HTMLElement, checked: boolean, color: string): void {
        if (checked) {
            el.style.background = color;
            el.style.borderColor = color;
            el.innerHTML = `<svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                <polyline points="2,6 5,9 10,3" stroke="white" stroke-width="2"
                    stroke-linecap="round" stroke-linejoin="round"/></svg>`;
        } else {
            el.style.background = "transparent";
            el.style.borderColor = "#d0d4da";
            el.innerHTML = "";
        }
    }

    private updateBadge(): void {
        const badge = this.rootEl.querySelector(".fs-badge") as HTMLElement;
        if (!badge) return;
        const count = this.selectedKeys.size;
        badge.textContent = String(count);
        if (count > 0) {
            badge.classList.add("visible");
            badge.style.background = this.settings.checkboxCheckedColor;
        } else {
            badge.classList.remove("visible");
        }
    }

    private applyFilters(): void {
        const allSelected: ISelectionId[] = [];
        this.groups.forEach(group => {
            group.items
                .filter(item => item.selected)
                .forEach(item => allSelected.push(item.selectionId));
        });

        if (allSelected.length === 0) {
            this.selectionManager.clear();
        } else {
            this.selectionManager.select(allSelected, false);
        }

        this.isExpanded = false;
        this.render();
    }

    private injectStyles(): void {
        const ID = "fs-styles-v3";
        if (document.getElementById(ID)) return;

        const style = document.createElement("style");
        style.id = ID;
        style.textContent = `
            *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

            .fs-root {
                width: 100%;
                height: 100%;
                font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
                font-size: 13px;
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }

            .fs-trigger-btn {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                padding: 8px 14px 8px 12px;
                border: 1.5px solid #c8ccd4;
                border-radius: 8px;
                cursor: pointer;
                font-family: inherit;
                font-size: 13px;
                font-weight: 500;
                box-shadow: 0 1px 4px rgba(0,0,0,0.07);
                transition: box-shadow 0.15s;
                user-select: none;
                white-space: nowrap;
                align-self: flex-start;
                margin: 8px;
                flex-shrink: 0;
            }
            .fs-trigger-btn:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.11); }

            .fs-trigger-icon {
                display: flex; flex-direction: column; gap: 3.5px; flex-shrink: 0;
            }
            .fs-trigger-icon span {
                display: block; width: 14px; height: 1.8px;
                background: currentColor; border-radius: 2px;
            }

            .fs-chevron { display: flex; align-items: center; transition: transform 0.25s; }
            .fs-chevron.open { transform: rotate(180deg); }

            .fs-badge {
                display: none; font-size: 10px; font-weight: 700;
                border-radius: 10px; padding: 1px 6px;
                min-width: 18px; text-align: center; line-height: 1.6; color: #fff;
            }
            .fs-badge.visible { display: inline-block; }

            .fs-panel {
                flex: 1;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                border-top: 1px solid #f0f2f5;
            }

            .fs-header {
                display: flex; align-items: center; justify-content: space-between;
                padding: 10px 14px 8px;
                border-bottom: 1px solid #f0f2f5;
                flex-shrink: 0;
            }
            .fs-header-title { font-weight: 600; font-size: 13px; }
            .fs-header-close {
                background: none; border: none; cursor: pointer; color: #b0b4be;
                width: 24px; height: 24px; border-radius: 6px;
                display: flex; align-items: center; justify-content: center;
                transition: all 0.15s;
            }
            .fs-header-close:hover { color: #555; background: #f3f4f6; }

            .fs-search-wrapper {
                display: flex; align-items: center;
                margin: 8px 10px 4px;
                background: #f5f6f8; border: 1px solid #e8eaed;
                border-radius: 20px; padding: 5px 10px; gap: 6px;
                flex-shrink: 0;
            }
            .fs-search-icon { color: #c0c4cc; display: flex; align-items: center; }
            .fs-search-input {
                border: none; background: transparent; outline: none;
                font-size: 12px; color: #444; width: 100%; font-family: inherit;
            }
            .fs-search-input::placeholder { color: #c0c4cc; }

            .fs-groups {
                flex: 1;
                overflow-y: auto;
                padding: 4px 0;
            }
            .fs-groups::-webkit-scrollbar { width: 4px; }
            .fs-groups::-webkit-scrollbar-thumb { background: #e0e2e6; border-radius: 4px; }

            .fs-empty {
                padding: 16px; font-size: 12px; color: #aaa;
                text-align: center; font-style: italic;
            }

            .fs-group { margin-bottom: 2px; }
            .fs-group-header {
                display: flex; align-items: center; justify-content: space-between;
                padding: 7px 14px 4px; cursor: pointer; user-select: none;
                transition: background 0.12s;
            }
            .fs-group-header:hover { background: rgba(0,0,0,0.02); }
            .fs-group-title {
                display: flex; align-items: center; gap: 6px;
                font-size: 10.5px; font-weight: 700;
                letter-spacing: 0.06em; text-transform: uppercase;
            }
            .fs-group-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
            .fs-group-toggle { color: #c0c4cc; font-size: 15px; line-height: 1; }

            .fs-item-list {
                display: flex; flex-direction: column; gap: 1px;
                padding: 0 8px 6px; border-bottom: 1px solid #f3f4f6;
                overflow: hidden; max-height: 800px;
                transition: max-height 0.2s ease, padding 0.2s ease;
            }
            .fs-item-list.collapsed { max-height: 0; padding-bottom: 0; }

            .fs-item {
                display: flex; align-items: center; gap: 8px;
                padding: 5px 8px; border-radius: 6px; cursor: pointer;
                transition: background 0.12s;
            }
            .fs-checkbox {
                width: 15px; height: 15px; border-radius: 3px;
                border: 1.5px solid #d0d4da; flex-shrink: 0;
                display: flex; align-items: center; justify-content: center;
                transition: all 0.15s;
            }
            .fs-item-label {
                font-size: 12.5px; user-select: none;
                overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;
            }
            .fs-item.selected .fs-item-label { font-weight: 500; }

            .fs-apply-btn {
                margin: 8px 10px 10px;
                border: none; font-size: 12.5px; font-weight: 600;
                padding: 9px 0; cursor: pointer; letter-spacing: 0.03em;
                transition: opacity 0.15s, transform 0.1s;
                width: calc(100% - 20px); font-family: inherit;
                flex-shrink: 0;
            }
            .fs-apply-btn:hover { opacity: 0.87; }
            .fs-apply-btn:active { transform: scale(0.98); }
        `;
        document.head.appendChild(style);
    }
}
