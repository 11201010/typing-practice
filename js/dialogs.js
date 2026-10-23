import { state } from "./state.js";
import { addBook, addArticle, fetchBooksFromUrl, mergeBooks } from "./books.js";
import { readStore, writeStore } from "./storage.js";
import { buildBookSelectForNewArticle } from "./ui.js";

export function createDialogs(refs, callbacks) {
  const {
    customDialog,
    customTitleInput,
    customBodyInput,
    customCancel,
    customConfirm,
    bookDialog,
    bookModeSelect,
    bookTitleInput,
    bookUrlInput,
    bookManualField,
    bookUrlField,
    bookCancel,
    bookConfirm,
    newArticleDialog,
    articleBookSelect,
    articleTitleInput,
    articleBodyInput,
    newArticleCancel,
    newArticleConfirm,
  } = refs;

  /* 自訂文章 */
  function openCustomDialog() {
    customTitleInput.value = state.currentTitle || "";
    customBodyInput.value = state.currentText || "";
    if (typeof customDialog.showModal === "function") customDialog.showModal();
    else customDialog.setAttribute("open", "");
    setTimeout(() => customTitleInput.focus(), 0);
  }
  function closeCustomDialog() {
    if (typeof customDialog.close === "function") customDialog.close();
    else customDialog.removeAttribute("open");
  }

  /* 新增書籍 */
  function syncBookMode() {
    const isJson = bookModeSelect.value === "json";
    bookManualField.style.display = isJson ? "none" : "";
    bookUrlField.style.display = isJson ? "" : "none";
  }
  function openBookDialog() {
    bookModeSelect.value = "manual";
    bookTitleInput.value = "";
    bookUrlInput.value = "";
    syncBookMode();
    if (typeof bookDialog.showModal === "function") bookDialog.showModal();
    else bookDialog.setAttribute("open", "");
    setTimeout(() => bookTitleInput.focus(), 0);
  }
  function closeBookDialog() {
    if (typeof bookDialog.close === "function") bookDialog.close();
    else bookDialog.removeAttribute("open");
  }

  /* 新增文章 */
  function openNewArticleDialog() {
    buildBookSelectForNewArticle(articleBookSelect);
    if (state.currentBookKey && state.books[state.currentBookKey]) {
      articleBookSelect.value = state.currentBookKey;
    }
    articleTitleInput.value = "";
    articleBodyInput.value = "";
    if (typeof newArticleDialog.showModal === "function")
      newArticleDialog.showModal();
    else newArticleDialog.setAttribute("open", "");
    setTimeout(() => articleTitleInput.focus(), 0);
  }
  function closeNewArticleDialog() {
    if (typeof newArticleDialog.close === "function") newArticleDialog.close();
    else newArticleDialog.removeAttribute("open");
  }

  /* 事件 */
  customCancel.addEventListener("click", closeCustomDialog);
  customConfirm.addEventListener("click", (e) => {
    e.preventDefault();
    const title = customTitleInput.value.trim();
    const body = customBodyInput.value.trim();
    if (!body) {
      alert("請輸入文章內容");
      return;
    }

    const sameBody = body === (state.currentText || "").trim();
    const store = readStore();
    store.customText = body;
    if (!store.settings) store.settings = {};
    store.settings.customTitle = title || "自訂文章";
    writeStore(store);

    closeCustomDialog();

    if (state.currentKey === "custom" && sameBody) {
      state.currentTitle = title || "自訂文章";
      callbacks.updateTitle();
      callbacks.saveProgressNow();
    } else {
      callbacks.switchArticle("custom", body, title || "自訂文章");
    }
  });

  bookModeSelect.addEventListener("change", syncBookMode);
  bookCancel.addEventListener("click", closeBookDialog);

  bookConfirm.addEventListener("click", (e) => {
    e.preventDefault();

    if (bookModeSelect.value === "manual") {
      const title = bookTitleInput.value.trim();
      if (!title) {
        alert("請輸入書名");
        return;
      }
      addBook(title);
      callbacks.buildTextOptions();
      closeBookDialog();
      return;
    }

    const url = bookUrlInput.value.trim();
    if (!url) {
      alert("請輸入 JSON 網址");
      return;
    }

    bookConfirm.disabled = true;
    bookConfirm.textContent = "載入中…";

    fetchBooksFromUrl(url)
      .then((books) => {
        const count = mergeBooks(books);
        callbacks.buildTextOptions();
        closeBookDialog();
        alert(`已加入 ${count} 本書`);
      })
      .catch((err) => {
        alert(
          "載入失敗：" + err.message + "\n請確認網址可存取，且回應允許 CORS。",
        );
      })
      .finally(() => {
        bookConfirm.disabled = false;
        bookConfirm.textContent = "確定";
      });
  });

  newArticleCancel.addEventListener("click", closeNewArticleDialog);
  newArticleConfirm.addEventListener("click", (e) => {
    e.preventDefault();

    let bookKey = articleBookSelect.value;
    const title = articleTitleInput.value.trim();
    const body = articleBodyInput.value.trim();

    if (bookKey === "__new__") {
      const bookTitle = prompt("請輸入新書名：", "");
      if (!bookTitle || !bookTitle.trim()) {
        alert("未建立新書，已取消");
        return;
      }
      bookKey = addBook(bookTitle.trim());
      callbacks.buildTextOptions();
    }

    if (!title) {
      alert("請輸入文章標題");
      return;
    }
    if (!body) {
      alert("請輸入文章內容");
      return;
    }
    if (!state.books[bookKey]) {
      alert("書籍不存在");
      return;
    }

    const key = addArticle(bookKey, title, body);
    callbacks.buildTextOptions();
    closeNewArticleDialog();
    callbacks.switchArticle(key, body, title);
  });

  return {
    openCustomDialog,
    closeCustomDialog,
    openBookDialog,
    closeBookDialog,
    openNewArticleDialog,
    closeNewArticleDialog,
  };
}
