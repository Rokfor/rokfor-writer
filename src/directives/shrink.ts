import { Directive, HostListener, ElementRef } from "@angular/core";

@Directive({
selector: "ion-textarea[autoresize]" // Attribute selector
})
export class Autoresize {
  constructor(public element: ElementRef) {
    this.element = element;
  }
  @HostListener("focusout", ["$event.target.value"]) 
  onBlur(textArea: HTMLTextAreaElement) {
    this.element.nativeElement.classList.remove('focused');
  }

  @HostListener("focus", ["$event.target.value"]) 
  onFocus(textArea: HTMLTextAreaElement) {
    this.element.nativeElement.classList.add('focused');
  }
}
