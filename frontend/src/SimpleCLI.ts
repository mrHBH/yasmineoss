class StaticCLI {
    private static createCursor(container: HTMLElement): HTMLElement {
        const cursor = document.createElement('span');
        cursor.textContent = '▋';
        cursor.style.visibility = 'hidden'; // Initially hide the cursor
        container.appendChild(cursor);
        return cursor;
    }

    private static createPrompt(container: HTMLElement): HTMLElement {
        const prompt = document.createElement('span');
        prompt.textContent = '➜ ';
        prompt.style.visibility = 'hidden'; // Initially hide the prompt
        container.appendChild(prompt);
        return prompt;
    }

    public static async typeInside(container: HTMLElement, textelementtag:string, text: string, delay: number = 100 , override: boolean = false): Promise<void> {


        //query textelementtag from the container
        let textelement = container.querySelector(textelementtag) as HTMLElement;
        if (!textelement) {
            textelement = container.querySelector(`.${textelementtag}`) as HTMLElement;
        }
        else if (!textelement) {
           textelement = container.querySelector(`#${textelementtag}`) as HTMLElement;
        }
        else if (!textelement) {
            throw new Error(`Element with tag ${textelementtag} not found`);
        }
        const cursor = this.ensureCursor(container);


        let currentText = override ? '' : textelement.textContent || '';

        for (const char of text) {
            await new Promise<void>((resolve) => {
                setTimeout(() => {
                    currentText += char;
                    textelement.textContent = currentText;
                    container.appendChild(cursor); // Append cursor after updating text
                    cursor.style.visibility = 'visible'; // Make sure cursor is visible
                    resolve();
                }, delay);
            });
        }
    }

    public static insertNewLine(container: HTMLElement): void {
        container.appendChild(document.createElement('br'));
        const cursor = this.ensureCursor(container);
        container.appendChild(cursor); // Append cursor at the new line
    }

    public static showCursor(container: HTMLElement): void {
        const cursor = this.ensureCursor(container);
        cursor.style.visibility = 'visible';
    }

    public static hideCursor(container: HTMLElement): void {
        const cursor = this.ensureCursor(container);
        cursor.style.visibility = 'hidden';
    }

    public static showPrompt(container: HTMLElement): void {
        const prompt = this.ensurePrompt(container);
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

    private static ensurePrompt(container: HTMLElement): HTMLElement {
        let prompt = container.querySelector('span[data-cli-prompt]') as HTMLElement;
        if (!prompt) {
            prompt = this.createPrompt(container);
            prompt.setAttribute('data-cli-prompt', '➜');
        }
        return prompt;
    }
}

export { StaticCLI };
