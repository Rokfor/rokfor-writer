import { Directive, ElementRef, HostListener, Renderer2 } from '@angular/core';

@Directive({
  selector: '[appAutoGrow]' // Use the same selector
})
export class AutoGrowDirective {

  constructor(private el: ElementRef, private renderer: Renderer2) {}

  @HostListener('ionChange') onInput(): void {
    this.adjustTextAreaHeight();
  }

  ngAfterViewInit() {
    // Initial adjustment when the view initializes
    setTimeout(() => this.adjustTextAreaHeight(), 0); // Timeout to ensure DOM elements are loaded
  }

  private adjustTextAreaHeight(): void {
    let textarea = this.el.nativeElement.querySelector('textarea');
    if (textarea) {
        this.renderer.setStyle(textarea, 'overflow', 'hidden');
        this.renderer.setStyle(textarea, 'height', 'auto');
        this.renderer.setStyle(textarea, 'height', textarea.scrollHeight + 'px');
    }
  }
}
