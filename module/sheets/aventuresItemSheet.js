export default class aventuresItemSheet extends ItemSheet{
    get template(){
        console.log(`aventures | Récupération du fichier html ${this.item.type}-sheet.`);

        return `systems/aventures/templates/sheets/${this.item.type}-sheet.html`;
    }

    async getData(options){
        const data = await super.getData(options);
        data.systemData = data.data.system;
        data.descriptionHTML = await TextEditor.enrichHTML(data.systemData.description, {
            secrets: this.document.isOwner,
            async: true
        });
        return data;
    }

    activateListeners(html) {
        super.activateListeners(html);
        const el = html[0].closest(".app");

        const observer = new ResizeObserver(entries => {
            for (let entry of entries) {
                const width = entry.contentRect.width;
                el.classList.toggle("compact", width < 500);
            }
        });

        observer.observe(el);
    }
}