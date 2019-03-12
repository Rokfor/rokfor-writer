import { Directive, HostListener, ElementRef } from "@angular/core";

@Directive({
selector: "ion-textarea[autoresize]" // Attribute selector
})
export class Autoresize {

  //@HostListener("input", ["$event.target"])
  //onInput(textArea: HTMLTextAreaElement): void {
  //  this.adjust();
  //}

  constructor(public element: ElementRef) {
    this.element = element;
    setTimeout(() => this.adjust(), 0);
  }

  @HostListener('input') onTextareaInput() {
    setTimeout(() => this.adjust(), 0);
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.adjust(), 0);
  }
  
  ngOnInit():void {
    setTimeout(() => this.adjust(), 0);
  }

  ngOnChanges():void {
    setTimeout(() => this.adjust(), 0);
  }

  adjust(): void {
    let ta = this.element.nativeElement.querySelector("textarea");
    if (ta !== null) {
      ta.style.overflow = "hidden";
      ta.style.height = "auto";
      ta.style.height = ta.scrollHeight + "px";
    }
  }
}
