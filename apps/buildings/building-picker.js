// Searchable, single-selection combobox; focus stays in the search field.
export function createBuildingPicker({root, items, onSelect}) {
  const input = root.querySelector('#search');
  const toggle = root.querySelector('#picker-toggle');
  const popup = root.querySelector('#picker-popup');
  const listbox = root.querySelector('#catalogue');
  const status = root.querySelector('#picker-status');
  let selected = items[0]?.id, group = '', query = '', matches = [];
  let isOpen = false, activeIndex = -1, suppressFocusOpen = false;
  const selectedName = () => items.find(item => item.id === selected)?.name || '';

  function activate(index, scroll = false) {
    activeIndex = index;
    const options = [...listbox.querySelectorAll('[role="option"]')];
    options.forEach((option, i) => option.classList.toggle('active', i === index));
    if (isOpen && options[index]) {
      input.setAttribute('aria-activedescendant', options[index].id);
      if (scroll) options[index].scrollIntoView({block: 'nearest'});
    } else input.removeAttribute('aria-activedescendant');
  }

  function close() {
    isOpen = false;
    popup.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Show building options');
    input.removeAttribute('aria-activedescendant');
    query = '';
    input.value = selectedName();
    if (document.activeElement === input) input.select();
  }

  function choose(item) {
    selected = item.id;
    onSelect(item.id);
    close();
    suppressFocusOpen = true;
    input.focus({preventScroll: true});
    input.select();
    suppressFocusOpen = false;
  }

  function render() {
    matches = items.filter(item => (!group || item.group === group) && [item.name, item.style, item.group].join(' ').toLowerCase().includes(query));
    listbox.replaceChildren();
    for (const [index, item] of matches.entries()) {
      const option = document.createElement('button');
      option.type = 'button';
      option.id = 'building-option-' + item.id;
      option.dataset.building = item.id;
      option.role = 'option';
      option.tabIndex = -1;
      option.setAttribute('aria-selected', String(item.id === selected));
      option.append(document.createTextNode(item.name));
      const style = document.createElement('small');
      style.textContent = item.style;
      option.append(style);
      option.addEventListener('mousedown', event => event.preventDefault());
      option.addEventListener('pointermove', () => activate(index));
      option.addEventListener('click', () => choose(item));
      listbox.append(option);
    }
    status.textContent = matches.length ? matches.length + ' building' + (matches.length === 1 ? '' : 's') : 'No buildings match. Try another search.';
    const index = matches.findIndex(item => item.id === selected);
    activate(matches.length ? Math.max(0, index) : -1, isOpen);
  }

  function open(selectText = true) {
    if (isOpen) return;
    isOpen = true;
    query = '';
    popup.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Hide building options');
    render();
    if (selectText) input.select();
  }

  input.addEventListener('focus', () => { if (!suppressFocusOpen) open(); });
  input.addEventListener('click', open);
  input.addEventListener('input', () => {
    if (!isOpen) open(false);
    query = input.value.trim().toLowerCase();
    render();
  });
  input.addEventListener('keydown', event => {
    if (event.isComposing) return;
    if (event.key === 'Escape') {
      if (isOpen) { event.preventDefault(); close(); }
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!isOpen) open();
      else if (matches.length) activate((activeIndex + (event.key === 'ArrowDown' ? 1 : -1) + matches.length) % matches.length, true);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (!isOpen) open();
      else if (matches[activeIndex]) choose(matches[activeIndex]);
    }
  });
  toggle.addEventListener('mousedown', event => event.preventDefault());
  toggle.addEventListener('click', () => {
    if (isOpen) close();
    else {
      open();
      suppressFocusOpen = true;
      input.focus({preventScroll: true});
      suppressFocusOpen = false;
    }
  });
  root.addEventListener('focusout', event => { if (!root.contains(event.relatedTarget)) close(); });
  document.addEventListener('pointerdown', event => { if (!root.contains(event.target)) close(); });

  return {
    setSelection(id) {
      selected = id;
      if (isOpen) render(); else input.value = selectedName();
    },
    setGroup(value) {
      group = value;
      query = '';
      input.value = selectedName();
      if (isOpen) render();
    }
  };
}
