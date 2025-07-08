import { Component, input, output, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PropControl } from './component-metadata';
import { IconComponent } from '../../shared/ui/icon/icon.component';

@Component({
  selector: 'app-prop-control',
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="prop-control">
      <label class="prop-label">
        {{ control().label }}
        @if (control().description) {
          <span class="prop-description">{{ control().description }}</span>
        }
      </label>
      
      <div class="prop-input">
        @switch (control().type) {
          @case ('text') {
            <input
              type="text"
              class="text-input"
              [value]="currentValue() ?? ''"
              (input)="handleTextChange($event)"
              [placeholder]="control().label"
            />
          }
          
          @case ('textarea') {
            <textarea
              class="textarea-input"
              [value]="currentValue() ?? ''"
              (input)="handleTextChange($event)"
              [placeholder]="control().label"
              rows="3"
            ></textarea>
          }
          
          @case ('number') {
            <input
              type="number"
              class="number-input"
              [value]="currentValue() ?? 0"
              (input)="handleNumberChange($event)"
              [min]="control().min"
              [max]="control().max"
              [step]="control().step || 1"
            />
          }
          
          @case ('slider') {
            <div class="slider-container">
              <input
                type="range"
                class="slider-input"
                [value]="currentValue() ?? 0"
                (input)="handleNumberChange($event)"
                [min]="control().min || 0"
                [max]="control().max || 100"
                [step]="control().step || 1"
              />
              <span class="slider-value">{{ currentValue() ?? 0 }}</span>
            </div>
          }
          
          @case ('boolean') {
            <label class="toggle-container">
              <input
                type="checkbox"
                class="toggle-input"
                [checked]="!!currentValue()"
                (change)="handleBooleanChange($event)"
              />
              <span class="toggle-slider"></span>
              <span class="toggle-label">{{ currentValue() ? 'Enabled' : 'Disabled' }}</span>
            </label>
          }
          
          @case ('select') {
            <select
              class="select-input"
              [value]="currentValue() ?? ''"
              (change)="handleSelectChange($event)"
            >
              @for (option of control().options; track option.value) {
                <option [value]="option.value">{{ option.label }}</option>
              }
            </select>
          }
          
          @case ('color') {
            <div class="color-container">
              <input
                type="color"
                class="color-input"
                [value]="currentValue() ?? '#000000'"
                (input)="handleTextChange($event)"
              />
              <input
                type="text"
                class="color-text"
                [value]="currentValue() ?? '#000000'"
                (input)="handleTextChange($event)"
              />
            </div>
          }
        }
      </div>
      
      @if (currentValue() !== control().defaultValue) {
        <button
          type="button"
          class="reset-button"
          (click)="resetValue()"
          title="Reset to default"
        >
          <app-icon name="refresh" size="sm" />
        </button>
      }
    </div>
  `,
  styles: [`
    .prop-control {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding: 1rem;
      border: 1px solid var(--border);
      border-radius: 0.5rem;
      background: var(--background-lighter);
      position: relative;
    }

    .prop-label {
      font-weight: 500;
      color: var(--text);
      font-size: 0.875rem;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .prop-description {
      font-weight: 400;
      color: var(--text-muted);
      font-size: 0.75rem;
    }

    .prop-input {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .text-input,
    .number-input,
    .select-input,
    .color-text {
      flex: 1;
      padding: 0.5rem;
      border: 1px solid var(--border);
      border-radius: 0.25rem;
      background: var(--background);
      color: var(--text);
      font-family: inherit;
      font-size: 0.875rem;
    }

    .text-input:focus,
    .number-input:focus,
    .select-input:focus,
    .color-text:focus {
      outline: 2px solid var(--primary);
      outline-offset: 1px;
    }

    .textarea-input {
      width: 100%;
      padding: 0.5rem;
      border: 1px solid var(--border);
      border-radius: 0.25rem;
      background: var(--background);
      color: var(--text);
      font-family: inherit;
      font-size: 0.875rem;
      resize: vertical;
    }

    .textarea-input:focus {
      outline: 2px solid var(--primary);
      outline-offset: 1px;
    }

    .slider-container {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex: 1;
    }

    .slider-input {
      flex: 1;
      height: 4px;
      background: var(--border);
      border-radius: 2px;
      outline: none;
      appearance: none;
    }

    .slider-input::-webkit-slider-thumb {
      appearance: none;
      width: 16px;
      height: 16px;
      background: var(--primary);
      border-radius: 50%;
      cursor: pointer;
    }

    .slider-input::-moz-range-thumb {
      width: 16px;
      height: 16px;
      background: var(--primary);
      border-radius: 50%;
      border: none;
      cursor: pointer;
    }

    .slider-value {
      min-width: 2rem;
      text-align: center;
      font-size: 0.875rem;
      color: var(--text-secondary);
    }

    .toggle-container {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      cursor: pointer;
    }

    .toggle-input {
      display: none;
    }

    .toggle-slider {
      position: relative;
      width: 44px;
      height: 24px;
      background: var(--border);
      border-radius: 12px;
      transition: all 0.2s;
    }

    .toggle-slider::before {
      content: '';
      position: absolute;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: var(--background);
      top: 2px;
      left: 2px;
      transition: all 0.2s;
    }

    .toggle-input:checked + .toggle-slider {
      background: var(--primary);
    }

    .toggle-input:checked + .toggle-slider::before {
      transform: translateX(20px);
    }

    .toggle-label {
      font-size: 0.875rem;
      color: var(--text-secondary);
    }

    .color-container {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex: 1;
    }

    .color-input {
      width: 40px;
      height: 32px;
      border: 1px solid var(--border);
      border-radius: 0.25rem;
      cursor: pointer;
    }

    .color-text {
      flex: 1;
    }

    .reset-button {
      position: absolute;
      top: 0.5rem;
      right: 0.5rem;
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      padding: 0.25rem;
      border-radius: 0.25rem;
      transition: all 0.2s;
    }

    .reset-button:hover {
      background: var(--background-darker);
      color: var(--primary);
    }

    .reset-button:focus {
      outline: 2px solid var(--primary);
      outline-offset: 1px;
    }
  `]
})
export class PropControlComponent {
  readonly control = input.required<PropControl>();
  readonly value = input.required<any>();
  readonly valueChange = output<any>();

  readonly currentValue = signal<any>(null);

  constructor() {
    // Use effect to safely handle input value changes
    effect(() => {
      const inputValue = this.value();
      if (inputValue !== undefined && inputValue !== null) {
        this.currentValue.set(inputValue);
      }
    });
  }

  handleTextChange(event: Event): void {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    const newValue = target.value;
    this.currentValue.set(newValue);
    this.valueChange.emit(newValue);
  }

  handleNumberChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const newValue = target.valueAsNumber;
    this.currentValue.set(newValue);
    this.valueChange.emit(newValue);
  }

  handleBooleanChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const newValue = target.checked;
    this.currentValue.set(newValue);
    this.valueChange.emit(newValue);
  }

  handleSelectChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const newValue = target.value;
    this.currentValue.set(newValue);
    this.valueChange.emit(newValue);
  }

  resetValue(): void {
    const defaultValue = this.control().defaultValue;
    this.currentValue.set(defaultValue);
    this.valueChange.emit(defaultValue);
  }
}