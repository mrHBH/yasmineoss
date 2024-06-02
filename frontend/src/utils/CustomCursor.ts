import { tween } from "shifty";
import { interpolate, toCircle, fromCircle } from "flubber";

class CustomCursor {
  private cursor: HTMLElement;
  private dot: SVGPathElement;
  private currentPath =   "M5 5 m-2, 0 a2,2 0 1,0 4,0 a2,2 0 1,0 -4,0";   




  constructor() {
    this.cursor = document.createElement('div');
    this.cursor.style.position = 'fixed';
    this.cursor.style.pointerEvents = 'none';
    this.cursor.style.zIndex = '9999';
    this.cursor.style.width = '15px';
    this.cursor.style.height = '15px';
    this.cursor.style.borderRadius = '50%';
    this.cursor.style.border = '1px solid #985';
    this.cursor.style.transition = 'transform 0.3s ease';

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 10 7.5');
    this.dot = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    this.dot.setAttribute('d', this.currentPath);
    this.dot.style.stroke = "#895";
    this.dot.style.fill = "#895";
    this.dot.style.strokeWidth = "1";
    svg.appendChild(this.dot);
    this.cursor.appendChild(svg);


     
    //change the 

    document.body.appendChild(this.cursor);

    document.addEventListener('mousemove', this.onMouseMove.bind(this));
    document.addEventListener('click', this.onClick.bind(this));
    document.addEventListener('contextmenu', this.onRightClick.bind(this));

    //override default hover cursor to be same but with red dot and a bit larger 
    //document.body.style.cursor = 'none';

    this.interpolateToCircle(this.currentPath, 500);
  }

  private onMouseMove(event: MouseEvent) {
    const cursorWidth = parseInt(this.cursor.style.width);
    const cursorHeight = parseInt(this.cursor.style.height);
    const dotWidth = 10;
    const dotHeight = 10;

    this.cursor.style.top = `${event.clientY - (cursorHeight / 2) - ( 2* dotHeight / 2)}px`;
    this.cursor.style.left = `${event.clientX - (cursorWidth / 2) + (4*dotWidth / 4)}px`;

    const target = event.target as HTMLElement;
    let newPath: string;
    if (target.classList.contains('next-arrow')) {
      newPath = "M8 5 L6 7 L6 6 L2 6 L2 4 L6 4 L6 3 L8 5 Z";

    } else if (target.classList.contains('back-arrow')) {
      newPath = "M2 5 L4 3 L4 4 L8 4 L8 6 L4 6 L4 7 L2 5 Z";

    } else {
      newPath = "M5 5 m-2, 0 a2,2 0 1,0 4,0 a2,2 0 1,0 -4,0";
    }

    if (this.currentPath !== newPath) {
      this.interpolateShape(this.currentPath, newPath, 300);
      this.currentPath = newPath;
    }
  }

  private interpolateShape(from: string, to: string, duration: number) {
    const interpolator = interpolate(from, to);
    tween({
      from: { shape: 0 },
      to: { shape: 1 },
      duration: duration,
      easing: "easeOutQuad",
      render: (state: any) => {
        this.dot.setAttribute("d", interpolator(state.shape));
      },
    });
  }

  private interpolateToCircle(from: string, duration: number) {
    const interpolator = toCircle(from, 2.5, 2.5, 2);
    tween({
      from: { shape: 0 },
      to: { shape: 1 },
      duration: duration,
      easing: "easeOutQuad",
      render: (state: any) => {
        this.dot.setAttribute("d", interpolator(state.shape));
      },
    });
  }

  private interpolateFromCircle(to: string, duration: number) {
    const interpolator = fromCircle(5, 5, 2, to);
    tween({
      from: { shape: 0 },
      to: { shape: 1 },
      duration: duration,
      easing: "easeOutQuad",
      render: (state: any) => {
        this.dot.setAttribute("d", interpolator(state.shape));
      },
    });
  }

  private onClick() {
    this.cursor.style.transform = 'scale(0.8)';
    setTimeout(() => {
      this.cursor.style.transform = '';
    }, 200);
  }

  private onRightClick(event: MouseEvent) {
    event.preventDefault();

   // this.dot.setAttribute("d", "M3 3 L7 7 M7 3 L3 7");
    this.interpolateShape(  this.currentPath, "M3 3 L7 7 M7 7 L7 3 L3 7", 500);

    setTimeout(() => {
      this.interpolateShape("M3 3 L7 7 M7 7 L7 3 L3 7", this.currentPath, 500);

     }, 1500);
  }
}

export { CustomCursor };