import { CommonModule } from "@angular/common";
import { Component, ElementRef, EventEmitter, Input, OnChanges, Output, QueryList, SimpleChanges, ViewChildren } from "@angular/core";

@Component({
  selector: "app-typeahead-select",
  standalone: true,
  imports: [CommonModule],
  template: `
  <div class="typeahead">
    <input
      class="select"
      [placeholder]="placeholder"
      [disabled]="disabled"
      [value]="value"
      autocomplete="off"
      spellcheck="false"
      (input)="onInput($event)"
      (focus)="onFocus()"
      (blur)="onBlur()"
      (keydown)="onKeyDown($event)"
      (keydown.escape)="close()"
    />

    <div *ngIf="loading" class="typeahead-loading">
      <div class="loading-bar"><div class="loading-bar-inner"></div></div>
    </div>

    <div
      *ngIf="isOpen && !loading && queryValue.length >= minQueryLength"
      class="typeahead-list"
      role="listbox"
    >
      <button
        *ngFor="let option of filteredOptions; let i = index"
        #optionEl
        type="button"
        class="typeahead-option"
        [class.is-active]="i === activeIndex"
        (mousedown)="onOptionMouseDown($event, option)"
      >
        {{ option }}
      </button>
      <div *ngIf="!filteredOptions.length" class="typeahead-empty">Sem resultados</div>
    </div>
  </div>
  `
})
export class TypeaheadSelectComponent implements OnChanges {
  @Input() options: string[] = [];
  @Input() placeholder = "";
  @Input() disabled = false;
  @Input() value = "";
  @Input() loading = false;
  @Input() minQueryLength = 1;
  @Input() maxResults = 12;
  @Input() matchMode: "startsWith" | "contains" = "contains";

  @Output() valueChange = new EventEmitter<string>();

  filteredOptions: string[] = [];
  queryValue = "";
  isOpen = false;
  isFocused = false;
  activeIndex = -1;
  @ViewChildren("optionEl") optionEls!: QueryList<ElementRef<HTMLButtonElement>>;

  private blurTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnChanges(changes: SimpleChanges) {
    if (changes.loading && this.loading) {
      this.isOpen = false;
      this.filteredOptions = [];
      return;
    }

    if (changes.options || changes.value || changes.loading) {
      this.updateFiltered(this.value);
      if (this.isFocused && !this.loading && this.queryValue.length >= this.minQueryLength) {
        this.isOpen = true;
      }
    }
  }

  onInput(event: Event) {
    const next = (event.target as HTMLInputElement).value;
    this.valueChange.emit(next);
    if (this.loading) {
      this.queryValue = (next ?? "").trim();
      this.filteredOptions = [];
      this.isOpen = false;
      return;
    }
    this.isOpen = true;
    this.updateFiltered(next);
  }

  onFocus() {
    this.isFocused = true;
    if (this.loading) {
      this.isOpen = false;
      return;
    }
    this.isOpen = true;
    this.updateFiltered(this.value);
  }

  onBlur() {
    this.isFocused = false;
    if (this.blurTimer) clearTimeout(this.blurTimer);
    this.blurTimer = setTimeout(() => {
      this.isOpen = false;
    }, 120);
  }

  close() {
    this.isOpen = false;
    this.activeIndex = -1;
  }

  onOptionMouseDown(event: MouseEvent, option: string) {
    event.preventDefault();
    this.pick(option);
  }

  onKeyDown(event: KeyboardEvent) {
    if (this.loading) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      this.isOpen = true;
      if (!this.filteredOptions.length) this.updateFiltered(this.value);
      if (!this.filteredOptions.length) return;
      this.activeIndex = (this.activeIndex + 1) % this.filteredOptions.length;
      this.scrollActiveIntoView();
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      this.isOpen = true;
      if (!this.filteredOptions.length) this.updateFiltered(this.value);
      if (!this.filteredOptions.length) return;
      this.activeIndex =
        this.activeIndex <= 0
          ? this.filteredOptions.length - 1
          : this.activeIndex - 1;
      this.scrollActiveIntoView();
      return;
    }

    if (event.key === "Enter") {
      if (!this.isOpen) return;
      if (this.activeIndex < 0 || this.activeIndex >= this.filteredOptions.length) return;
      event.preventDefault();
      this.pick(this.filteredOptions[this.activeIndex]);
    }
  }

  private pick(option: string) {
    this.valueChange.emit(option);
    this.isOpen = false;
    this.activeIndex = -1;
  }

  private updateFiltered(value: string) {
    const query = (value ?? "").trim();
    this.queryValue = query;
    if (query.length < this.minQueryLength) {
      this.filteredOptions = [];
      return;
    }

    const q = this.normalizeText(query);
    const matches = this.options.filter((opt) => {
      const normalized = this.normalizeText(opt);
      return this.matchMode === "startsWith" ? normalized.startsWith(q) : normalized.includes(q);
    });
    this.filteredOptions = matches.slice(0, this.maxResults);
    if (this.activeIndex >= this.filteredOptions.length) {
      this.activeIndex = this.filteredOptions.length ? 0 : -1;
    }
    if (this.activeIndex >= 0) {
      this.scrollActiveIntoView();
    }
  }

  private scrollActiveIntoView() {
    if (!this.isOpen) return;
    setTimeout(() => {
      const el = this.optionEls?.get(this.activeIndex)?.nativeElement;
      if (el) el.scrollIntoView({ block: "nearest" });
    }, 0);
  }

  private normalizeText(value: string): string {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }
}
