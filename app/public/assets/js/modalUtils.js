const Modal = {
    modal: null,
    overlay: null,
    content: null,

    init() {
        this.modal = document.getElementById('globalModal');
        this.overlay = this.modal.querySelector('.modal-overlay');
        this.content = this.modal.querySelector('.modal-content');

        this.overlay.addEventListener('click', () => this.close());
    },

    open(contentHTML) {
        this.content.innerHTML = contentHTML;
        this.modal.classList.add('open');
    },

    close() {
        this.modal.classList.remove('open');
        this.content.innerHTML = '';
    }
};
