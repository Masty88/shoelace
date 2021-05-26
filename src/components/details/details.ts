import { LitElement, html, unsafeCSS } from 'lit';
import { customElement, property, query } from 'lit/decorators';
import { classMap } from 'lit-html/directives/class-map';
import { animateTo, stopAnimations, shimKeyframesHeightAuto } from '../../internal/animate';
import { event, EventEmitter, watch } from '../../internal/decorators';
import { focusVisible } from '../../internal/focus-visible';
import { getAnimation, setDefaultAnimation } from '../../utilities/animation-registry';
import styles from 'sass:./details.scss';

let id = 0;

/**
 * @since 2.0
 * @status stable
 *
 * @dependency sl-icon
 *
 * @slot - The details' content.
 * @slot summary - The details' summary. Alternatively, you can use the summary prop.
 *
 * @part base - The component's base wrapper.
 * @part header - The summary header.
 * @part summary - The details summary.
 * @part summary-icon - The expand/collapse summary icon.
 * @part content - The details content.
 *
 * @customProperty --hide-duration - The length of the hide transition.
 * @customProperty --hide-timing-function - The timing function (easing) to use for the hide transition.
 * @customProperty --show-duration - The length of the show transition.
 * @customProperty --show-timing-function - The timing function (easing) to use for the show transition.
 *
 * @animation details.show - The animation to use when showing details. You can use `height: auto` with this animation.
 * @animation details.hide - The animation to use when hiding details. You can use `height: auto` with this animation.
 */
@customElement('sl-details')
export default class SlDetails extends LitElement {
  static styles = unsafeCSS(styles);

  @query('.details') details: HTMLElement;
  @query('.details__header') header: HTMLElement;
  @query('.details__body') body: HTMLElement;

  private componentId = `details-${++id}`;
  private hasInitialized = false;

  /** Indicates whether or not the details is open. You can use this in lieu of the show/hide methods. */
  @property({ type: Boolean, reflect: true }) open = false;

  /** The summary to show in the details header. If you need to display HTML, use the `summary` slot instead. */
  @property() summary: string;

  /** Disables the details so it can't be toggled. */
  @property({ type: Boolean, reflect: true }) disabled = false;

  /** Emitted when the details opens. Calling `event.preventDefault()` will prevent it from being opened. */
  @event('sl-show') slShow: EventEmitter<void>;

  /** Emitted after the details opens and all transitions are complete. */
  @event('sl-after-show') slAfterShow: EventEmitter<void>;

  /** Emitted when the details closes. Calling `event.preventDefault()` will prevent it from being closed. */
  @event('sl-hide') slHide: EventEmitter<void>;

  /** Emitted after the details closes and all transitions are complete. */
  @event('sl-after-hide') slAfterHide: EventEmitter<void>;

  async firstUpdated() {
    focusVisible.observe(this.details);

    this.body.hidden = !this.open;
    this.body.style.height = this.open ? 'auto' : '0';

    // Set the initialized flag after the first update is complete
    await this.updateComplete;
    this.hasInitialized = true;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    focusVisible.unobserve(this.details);
  }

  /** Shows the alert. */
  async show() {
    if (!this.hasInitialized || this.open || this.disabled) {
      return;
    }

    const slShow = this.slShow.emit();
    if (slShow.defaultPrevented) {
      this.open = false;
      return;
    }

    await stopAnimations(this);
    this.body.hidden = false;
    this.open = true;

    const { keyframes, options } = getAnimation(this, 'details.show');
    await animateTo(this.body, shimKeyframesHeightAuto(keyframes, this.body.scrollHeight), options);
    this.body.style.height = 'auto';

    this.slAfterShow.emit();
  }

  /** Hides the alert */
  async hide() {
    // Prevent subsequent calls to the method, whether manually or triggered by the `open` watcher
    if (!this.hasInitialized || !this.open || this.disabled) {
      return;
    }

    const slHide = this.slHide.emit();
    if (slHide.defaultPrevented) {
      this.open = true;
      return;
    }

    await stopAnimations(this);
    this.open = false;

    const { keyframes, options } = getAnimation(this, 'details.hide');
    await animateTo(this.body, shimKeyframesHeightAuto(keyframes, this.body.scrollHeight), options);
    this.body.hidden = true;
    this.body.style.height = 'auto';

    this.slAfterHide.emit();
  }

  handleSummaryClick() {
    if (!this.disabled) {
      this.open ? this.hide() : this.show();
      this.header.focus();
    }
  }

  handleSummaryKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.open ? this.hide() : this.show();
    }

    if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      event.preventDefault();
      this.hide();
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      event.preventDefault();
      this.show();
    }
  }

  @watch('open')
  handleOpenChange() {
    this.open ? this.show() : this.hide();
  }

  render() {
    return html`
      <div
        part="base"
        class=${classMap({
          details: true,
          'details--open': this.open,
          'details--disabled': this.disabled
        })}
      >
        <header
          part="header"
          id=${`${this.componentId}-header`}
          class="details__header"
          role="button"
          aria-expanded=${this.open ? 'true' : 'false'}
          aria-controls=${`${this.componentId}-content`}
          aria-disabled=${this.disabled ? 'true' : 'false'}
          tabindex=${this.disabled ? '-1' : '0'}
          @click=${this.handleSummaryClick}
          @keydown=${this.handleSummaryKeyDown}
        >
          <div part="summary" class="details__summary">
            <slot name="summary">${this.summary}</slot>
          </div>

          <span part="summary-icon" class="details__summary-icon">
            <sl-icon name="chevron-right" library="system"></sl-icon>
          </span>
        </header>

        <div class="details__body">
          <div
            part="content"
            id=${`${this.componentId}-content`}
            class="details__content"
            role="region"
            aria-labelledby=${`${this.componentId}-header`}
          >
            <slot></slot>
          </div>
        </div>
      </div>
    `;
  }
}

setDefaultAnimation('details.show', {
  keyframes: [
    { height: '0', opacity: '0' },
    { height: 'auto', opacity: '1' }
  ],
  options: { duration: 250, easing: 'linear' }
});

setDefaultAnimation('details.hide', {
  keyframes: [
    { height: 'auto', opacity: '1' },
    { height: '0', opacity: '0' }
  ],
  options: { duration: 250, easing: 'linear' }
});

declare global {
  interface HTMLElementTagNameMap {
    'sl-details': SlDetails;
  }
}
