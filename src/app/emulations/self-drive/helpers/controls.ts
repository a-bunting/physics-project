export class Controls {

  forward: boolean;
  left: boolean;
  right: boolean;
  reverse: boolean;

    constructor(controlType: string) {
      this.forward = false;
      this.left = false;
      this.right = false;
      this.reverse = false;

      switch(controlType) {
        case "KEYS": this.#addKeyboardListeners(); break;
        case "DUMMY": this.forward = true; break;
        case "AI": break;
      }

    }

    #addKeyboardListeners(): void {
      // watch the key down events...
      document.onkeydown = (event) => {
        switch(event.key) {
          case "ArrowLeft": this.left = true; break;
          case "ArrowUp": this.forward = true; break;
          case "ArrowRight": this.right = true; break;
          case "ArrowDown": this.reverse = true; break;
        }
      }
      // watch the key up events...
      document.onkeyup = (event) => {
        switch(event.key) {
          case "ArrowLeft": this.left = false; break;
          case "ArrowUp": this.forward = false; break;
          case "ArrowRight": this.right = false; break;
          case "ArrowDown": this.reverse = false; break;
        }
      }

    }

}
