class StaticCLI {
  private static timeouts: { [key: string]: NodeJS.Timeout } = {};
  private static queues: { [key: string]: (() => Promise<void>)[] } = {};
  private static typingInProgress: { [key: string]: boolean } = {};
  static cancelTyping: boolean = false;

  private static createPrompt(container: HTMLElement): HTMLElement {
    const prompt = document.createElement('span');
    prompt.textContent = '➜ ';
    prompt.style.visibility = 'hidden';
    container.appendChild(prompt);
    return prompt;
  }

  public static async typeInside(
    container: HTMLElement,
    textelementtag: string,
    text: string,
    delay: number = 100,
    override: boolean = false
  ): Promise<void> {
    const key = `${container.id}-${textelementtag}`;
    if (this.timeouts[key]) {
      clearTimeout(this.timeouts[key]);
      delete this.timeouts[key];
    }

    let textelement = container.querySelector(textelementtag) as HTMLElement;
    if (!textelement) {
      textelement = container.querySelector(`.${textelementtag}`) as HTMLElement;
    } else if (!textelement) {
      textelement = container.querySelector(`#${textelementtag}`) as HTMLElement;
    } else if (!textelement) {
      throw new Error(`Element with tag ${textelementtag} not found`);
    }
    // const cursor = this.ensureCursor(container);

    let currentText = override ? '' : textelement.textContent || '';

    for (const char of text) {
      this.timeouts[key] = setTimeout(() => {
        currentText += char;
        textelement.textContent = currentText;
        //     container.appendChild(cursor);
        //  cursor.style.visibility = 'visible';
      }, delay);

      await new Promise<void>((resolve) => {
        setTimeout(resolve, delay);
      });

      if (this.cancelTyping) {
        this.cancelTyping = false;
        break;
      }
    }
  }

  private static createCursor(container: HTMLElement): HTMLElement {
    const cursor = document.createElement('span');
    cursor.setAttribute('data-cli-cursor', '▋');
    cursor.style.visibility = 'visible';
    container.appendChild(cursor);
    return cursor;
  }

  public static async type(
    container: HTMLElement,
    text: string,
    delay: number = 100,
    override: boolean = false
  ): Promise<void> {
 
    // Clear the container if override is true
    if (override) {
      container.innerHTML = '';
    }

    // Remove existing cursor
    const existingCursor = container.querySelector('span[data-cli-cursor]');
    if (existingCursor) {
      existingCursor.remove();
    }

    // Create and insert a cursor
    let cursor = this.createCursor(container);
    let currentContainer = container;

    let currentIndex = 0;

    while (currentIndex < text.length) {
      const remainingText = text.slice(currentIndex);
      let match = remainingText.match(/^<\/?[\w\s="/.':;#-\/\?]+>/); // Match HTML tags

      if (match) {
        // Handle HTML tag
        const tag = match[0];
        currentIndex += tag.length;

        if (tag.startsWith('</')) {
          // Closing tag: Move up to the parent element
          currentContainer = currentContainer.parentElement!;
        } else {
          // Opening tag or self-closing tag
          const tempContainer = document.createElement('div');
          tempContainer.innerHTML = tag;
          const element = tempContainer.firstChild as HTMLElement;

          if (element) {
            currentContainer.insertBefore(element, cursor);
            if (!tag.endsWith('/>') && !tag.startsWith('<input')) {
              // Move into the new element unless it's self-closing
              currentContainer = element;
            }
          }
        }
      } else {
        // Handle regular text
        const char = text[currentIndex];
        const charElement = document.createTextNode(char);
        currentContainer.insertBefore(charElement, cursor);
        currentIndex++;
      }

      cursor.style.visibility = 'visible';

      // Reposition the cursor
      currentContainer.appendChild(cursor);

      // Wait for the specified delay
      await new Promise<void>((resolve) => setTimeout(resolve, delay));

      // Stop typing if cancelTyping is true
      if (this.cancelTyping) {
        this.cancelTyping = false;
        break;
      }
    }

    // Add a space after the last character to ensure the cursor appears correctly
    const spaceElement = document.createTextNode(' ');
    currentContainer.insertBefore(spaceElement, cursor);

    // Remove the cursor after typing is complete
    cursor.remove();
  }
  public static typeSync(
    container: HTMLElement,
    text: string,
    delay: number = 100,
    override: boolean = false
  ): void {
    if (override) {
      container.innerHTML =  ''
 
    }
  
    // Append new text to container.innerHTML
    container.innerHTML += text;
 
  

 
  
    // // Optionally, insert a cursor (if needed)
    // const cursor = this.ensureCursor(container);
    // container.appendChild(cursor);
 
  }
  
  public static insertNewLine(container: HTMLElement , elementtagorid: string= ""): void {

    if (elementtagorid != "") {
    
      let textelement = container.querySelector(elementtagorid) as HTMLElement;
      if (!textelement) {
        textelement = container.querySelector(`.${elementtagorid}`) as HTMLElement;
      } else if (!textelement) {
        textelement = container.querySelector(`#${elementtagorid}`) as HTMLElement;
      } else if (!textelement) {
        throw new Error(`Element with tag ${elementtagorid} not found`);
      }
      textelement.appendChild(document.createElement('br'));
      const cursor = this.ensureCursor(container);
      textelement.appendChild(cursor);

    }
    else {
    container.appendChild(document.createElement('br'));
    const cursor = this.ensureCursor(container);
    container.appendChild(cursor);

    }
  }

  public static showCursor(container: HTMLElement): void {
    const cursor = this.ensureCursor(container);
    cursor.style.visibility = 'visible';
  }

  public static hideCursor(container: HTMLElement): void {
    const cursor = this.ensureCursor(container);
    cursor.style.visibility = 'hidden';
  }

  public static showPrompt(container: HTMLElement , elementtagorid: string= ""): void {
    const prompt = this.ensurePrompt(container);
    const cursor = this.ensureCursor(container);

    if (elementtagorid != "") {
    
      let textelement = container.querySelector(elementtagorid) as HTMLElement;
      if (!textelement) {
        textelement = container.querySelector(`.${elementtagorid}`) as HTMLElement;
      } else if (!textelement) {
        textelement = container.querySelector(`#${elementtagorid}`) as HTMLElement;
      } else if (!textelement) {
        throw new Error(`Element with tag ${elementtagorid} not found`);
      }
      textelement.appendChild(prompt);
      textelement.appendChild(cursor);

    }
    else {
    container.appendChild(prompt);
    container.appendChild(cursor);
    }
    prompt.style.visibility = 'visible';
  }

  public static hidePrompt(container: HTMLElement): void {
    const prompt = this.ensurePrompt(container);
    prompt.style.visibility = 'hidden';
  }

  private static ensureCursor(container: HTMLElement): HTMLElement {
    let cursor = container.querySelector('span[data-cli-cursor]') as HTMLElement;
    if (!cursor) {
      cursor = this.createCursor(container);
      cursor.setAttribute('data-cli-cursor', '▋');
    }
    return cursor;
  }

    static ensurePrompt(container: HTMLElement): HTMLElement {
    let prompt = container.querySelector('span[data-cli-prompt]') as HTMLElement;
    if (!prompt) {
      prompt = this.createPrompt(container);
      prompt.setAttribute('data-cli-prompt', '➜');
    }
    return prompt;
  }


 
}

export { StaticCLI };
