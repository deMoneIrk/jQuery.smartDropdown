(function($) {
	/**
	 * smartDropdown plugin creates a customizable dropdown from <input> tag
	 * © github.com/deMoneIrk/jQuery.smartDropdown
	 *
	 * TODO: автоматический ресайз поля для ввода e-mail
	 * TODO: анализ текстового поля при вставке готовой строки со списком e-mail адресов
	 * TODO: не разрешать вводить несколько одинаковых e-mail адресов
	 * */
	$.fn.smartDropdown = function(options) {
		var methods = {
			// Уничтожаем smartDropdown
			destroy: function() {
				methods.hide.apply(this, []);

				$(this).off('.smartDropdown');
				if ($(this).data('smartDropdown'))
					$(this).data('smartDropdown').config.snapTo.off('.smartDropdown');

				$(this).data('smartDropdown').dropdown.remove();
				$(this).removeData('smartDropdown');

				return true;
			},

			// Скрывает поле при потере фокуса элементов
			blur: function() {
				var _this = this, $this = $(this),
					data = $(this).data('smartDropdown');

				// Если собственные элементы создавать нельзя, то нужно проверить, что значение либо совпадает
				// с одним из значений списка, либо обнулить поле
				var value = $this.val().trim(),
					ok = false;

				for (var i in data.list) {
					if (i == 'length') continue;

					if ((data.list[i].name ? data.list[i].name : data.list[i].title).trim().toLowerCase() == value.trim().toLowerCase()) {
						ok = true;
						$(data.config.idField).val(data.list[i].id);

						data.list[i].yetSelected = true;
						data.list[i].selectedInField = data.id;

						if (typeof data.config.onItemSelect == 'function')
							data.config.onItemSelect.apply(this, [data.list[i]]);

						break;
					}
				}

				if (!ok) {
					// Если в текущем поле никакой элемент не выбран, то убираем yetSelected у предыдущего
					// заданного варианта
					if (!data.config.multiple) {
						for (var i in data.list)
							if (i !== 'length' && data.list[i].selectedInField == data.id)
								data.list[i].yetSelected = false;
					}

					// Если текст не найден, и новые элементы создавать не разрешается, то поле нужно обнулить
					if (!data.config.allowNewItems) {
						$(this).val('');
					} else {
						if (data.config.multiple) {
							if (typeof data.config.newItemCheck != 'function' || data.config.newItemCheck(value)) {
								var html = $('<div class="selected-item"><input type="hidden" name="' + data.config.fieldName + '[_new][]" value="' + value +
									'" /><span>' + value + '</span> <i></i></div>');

								html.find('i').on('click.smartDropdown', function() {
									$(this).closest('.selected-item').data('item') && ($(this).closest('.selected-item').data('item').yetSelected = false);
									$(this).closest('.selected-item').fadeOut(100, function() { $(this).remove(); });
								});

								$this.before(html);

								if (typeof data.config.onEnterNewValue == 'function')
									data.config.onEnterNewValue.apply(this, [value]);
							}
							$this.val('');
						} else {
							if (typeof data.config.onEnterNewValue == 'function')
								data.config.onEnterNewValue.apply(this, [$(this).val()]);
						}
					}

					// В любом случае обнуляем значение ID
					$(data.config.idField).val('');
				}

				setTimeout(function() {
					methods.hide.apply(_this);
				}, 200);
			},

			// При загрузке строит список элементов выпадающего списка и вешает на них события
			build: function() {
				var $this = $(this),
					data = $this.data('smartDropdown');

				if (data.list && data.list.length) {
					var ul = data.dropdown.find('ul');
					ul.html('');
					for (var i in data.list) {
						if (i == 'length') continue;

						data.itemList[i] = $('<li>' + data.config.itemOutput(data.list[i]) + '</li>');
						data.itemList[i].data({
							item: data.list[i],
							index: i
						}).on('click.smartDropdown', function(e) {
							methods.itemClick.apply(this, [e, $this]);
						}).on('mouseenter.smartDropdown', function() {
							$(this).closest('ul').find('.hover').removeClass('hover');
							$(this).addClass('hover');

							$(this).closest('.smart-dropdown').data('input').data('smartDropdown').currentHoveredItem = $(this).prevAll('li').length;
						}).appendTo(ul);
					}
				}

				data.dropdown.find('.borders').mCustomScrollbar({
					advanced: {
						updateOnBrowserResize: true,
						updateOnContentResize: true
					},
					autoHideScrollbar: false,
					contentTouchScroll: true,
					scrollButtons: {
						enable: false
					},
					scrollInertia: 100,
					theme: 'dark'
				});
			},

			// Отлавливает события клавиатуры и обрабатывает их, кроме того применяет фильтрацию к элементам
			catchKey: function(e) {
				var data = $(this).data('smartDropdown');

				if (e.which == 9) { // уход из поля по Tab-у
					methods.hide.apply(this);
				}

				// В случае, когда возможен ввод множества значений, обрываем ввод по запятой и точке с запятой
				if (data.config.multiple && this.value && this.value.search(/[;,]/) > -1) {
					e.preventDefault();
					if (this.value.match(/[;,\s]$/))
						this.value = this.value.substr(0, this.value.length - 1);

					methods.blur.apply(this);
					return false;
				}

				if (e.which in {38: 'down', 40: 'up', 13: 'enter', 27: 'esc'}) {
					e.preventDefault();

					if (e.which == 40 && data.currentHoveredItem < data.list.length - 1) {
						if (data.currentHoveredItem == -1) {
							var next = data.dropdown.find('li:visible:first');
						} else {
							var next = data.dropdown.find('.hover').nextAll('li:visible:first');
							if (!next.length) return false;
						}

						data.dropdown.find('.hover').removeClass('hover');

						data.currentHoveredItem = next.prevAll('li').length;
						data.itemList[data.currentHoveredItem].addClass('hover');

						if (typeof data.config.onItemKeyboardHover == 'function')
							data.config.onItemKeyboardHover.apply(this, [data.itemList[data.currentHoveredItem]]);
					} else if (e.which == 38 && data.currentHoveredItem > 0) {
						var prev = data.dropdown.find('.hover').prevAll('li:visible:first');
						if (!prev.length) return false;

						data.dropdown.find('.hover').removeClass('hover');

						data.currentHoveredItem = prev.prevAll('li').length;
						data.itemList[data.currentHoveredItem].addClass('hover');

						if (typeof data.config.onItemKeyboardHover == 'function')
							data.config.onItemKeyboardHover.apply(this, [data.itemList[data.currentHoveredItem]]);
					} else if (e.which == 27) {
						data.hiddenByUser = true;
						methods.hide.apply(this);
					} else if (e.which == 13) {
						if (data.currentHoveredItem > -1) {
							// Если есть элемент в фокусе, выбираем его
							data.dropdown.find('.hover a').click();
						} else if (data.dropdown.find('li:visible').length == 1) {
							// Если элемент единственный показываемый, выбираем его
							data.dropdown.find('li:visible').click();
						} else if (data.config.multiple && data.config.allowNewItems) {
							var $this = $(this),
								value = $this.val();

							if (typeof data.config.newItemCheck == 'function' && !data.config.newItemCheck(value)) {
								$this.css('color', 'red');
								setTimeout(function() { $this.css('color', 'black'); }, 300);
								return false;
							}

							var html = $('<div class="selected-item"><input type="hidden" name="' + data.config.fieldName + '[_new][]" value="' + value +
								'" /><span>' + value + '</span> <i></i></div>');

							html.find('i').on('click.smartDropdown', function() {
								$(this).closest('.selected-item').data('item') && ($(this).closest('.selected-item').data('item').yetSelected = false);
								$(this).closest('.selected-item').fadeOut(100, function() { $(this).remove(); });
							});

							$this.before(html);
							$this.val('');

							methods.setPosition.apply($this);
							methods.catchKey.apply($this, [{ which: -1 }]);

							if (typeof data.config.onEnterNewValue == 'function')
								data.config.onEnterNewValue.apply(this, [value]);
						}
					}

					if (typeof data.config.onCatchKey == 'function')
						data.config.onCatchKey.apply(this);

					return false;
				}

				// Item list filter
				var showCount = 0;
				for (var i in data.list)
					if (i != 'length') {
						var action = data.config.filterCallback(data.list[i], this.value, data.config) ? 'show' : 'hide';
						if (action == 'show') showCount++;

						data.itemList[i][action]();
					}

				data.dropdown.css('visibility', showCount ? 'visible' : 'hidden').find('.borders').css('height', Math.min(showCount * 41 - 1, data.config.maxHeight)).mCustomScrollbar('update');

				data.config.snapTo[showCount ? 'removeClass' : 'addClass']('sdd-no-items');

				if (!data.hiddenByUser)
					methods.show.apply(this);

				if (typeof data.config.onCatchKey == 'function')
					data.config.onCatchKey.apply(this);

				return true;
			},

			// Скрывает выпадающий список
			hide: function() {
				var $this = $(this),
					data = $this.data('smartDropdown');

				if (!data.dropdownVisible) return false;

				data.dropdownVisible = false;
				data.dropdown.detach();
			},

			// Создаёт выпадайку
			init: function(config) {
				config = $.extend({
					// Разрешать указывать собственные элементы в качестве значения поля
					allowNewItems: false,

					// Класс, добавляемый к выпадающему списку
					dropdownClass: '',

					fieldName: 'item',

					// Вызывается при фильтрации элементов по полям объекта
					filterCallback: function(item, query, config) {
						// Если элемент уже выбран, то его больше не выводим
						if (item.yetSelected)
							return false;

						if (!query) return true;

						var searchString = '', queryWords = query.toLowerCase().replace(/[^a-zа-я0-9\s]/g, '').replace(/\s{2,}/g, ' ').trim().split(' ');
						for (var i in config.searchFields)
							if (item[config.searchFields[i]] !== undefined)
								searchString += ' ' + item[config.searchFields[i]].toLowerCase().replace(/[^a-zа-я0-9\s]/g, '').trim()

						var found = true;
						for (var i in queryWords)
							if (searchString.search(queryWords[i]) < 0)
								found = false;

						return found;
					},

					// Поле, в которое следует сохранять ID выбранной записи из списка
					idField: false,

					// Используется для вывода HTML-кода конкретного элемента
					itemOutput: function(item) {
						var t = '';
						if (item.name) t = item.name;
						else if (item.title) t = item.title;
						else t = '<i>no title field detected</i>';

						return '<a href="javascript:void(0)">' + t + '</a>';
					},

					// Список элементов
					list: [],

					// Используется для задания отступа выпадающего меню от <input>-а
					marginTop: 0,

					maxHeight: 204,

					// Разрешать выбирать сразу несколько элементов
					multiple: false,

					// Функция проверки корректности нового добавляемого элемента
					newItemCheck: function(text) { return true; },

					// Callback срабатывает на каждый catchKey, кроме системных клавиш
					onCatchKey: function() { return true; },

					// Callback срабатывает при вводе пользователем собственного значения
					onEnterNewValue: function(val) { return true; },

					// Callback срабатывает при переходе на item по клавиатуре
					onItemKeyboardHover: function(hoveredItem) { return true; },

					// Callback срабатывает после инициализации компонента
					onLoad: function() { return true; },

					// Callback срабатывает при выборе пункта выпадающего списка
					onItemSelect: function(item) { return true; },

					// Поля исходного объекта, по которым можно производить поиск при вводе текста
					searchFields: ['name', 'title'],

					// Можно указать, к какому конкретно элементу привязывать выпадающий список
					snapTo: false,
					snappingToOtherObject: false // флаг того, что мы привязываемся к чужому объекту
				}, config);

				var $this = $(this),
					data = $this.data('smartDropdown');

				$this.attr('autocomplete', 'off');

				if (!config.snapTo)
					config.snapTo = $this;
				else
					config.snappingToOtherObject = true;

				if (data)
					return true;

				for (var i in config.list) {
					if (i == 'length') continue;

					if (typeof config.list[i] == 'string')
						config.list[i] = {name: config.list[i]};

					if (config.list[i].yetSelected == undefined) {
						config.list[i].yetSelected = false;
						config.list[i].selectedInField = null;
					}
				}

				data = {
					id: 'sdd' + Math.random(),
					config: config,
					currentHoveredItem: -1,
					dropdown: $('<div class="smart-dropdown' + (config.dropdownClass ? ' ' + config.dropdownClass : '') + '"><div class="borders"><ul></ul></div></div>'),
					hiddenByUser: false,
					itemList: {}
				};

				data.list = config.list;

				if (config.multiple) {
					if ($(data.config.snapTo).find('.selected-item').length) {
						for(var i in data.list) {
							var selectedItem = $(data.config.snapTo).find('.selected-item input[type=hidden][name*="' + data.list[i].id + '"]');
							if (selectedItem.length) {
								selectedItem.closest('.selected-item').addClass('selected-item-linked').data('item', data.list[i]).find('i').on('click', function() {
									$(this).closest('.selected-item').data('item') && ($(this).closest('.selected-item').data('item').yetSelected = false);
									$(this).closest('.selected-item').fadeOut(100, function() { $(this).remove(); });
								});

								data.list[i].yetSelected = true;
								data.list[i].selectedInField = data.id;
							}
						}
					}

					var notLinked = $(data.config.snapTo).find('.selected-item:not(.selected-item-linked)');
					if (notLinked.length)
						for(var i = 0; i < notLinked.length; i++)
							notLinked.eq(i).find('i').on('click', function() {
								$(this).closest('.selected-item').fadeOut(100, function() { $(this).remove(); });
							});
				}

				$this.data('id', data.id);
				data.dropdown.data('input', $this);

				$this.data('smartDropdown', data);
				methods.build.apply(this);

				if (config.snappingToOtherObject)
					config.snapTo.on('click.smartDropdown', function(e) {
						if ($(e.target).hasClass('selected-item') || $(e.target).closest('.selected-item').length)
							return false;

						if ($this.data('smartDropdown').dropdownVisible)
							return false;

						$this.focus();
					});

				$this
					.on('focus.smartDropdown', methods['show'])
					.on('keyup.smartDropdown', methods['catchKey'])
					.on('keydown.smartDropdown', function(e) {
						/**
						 * Отслеживаем backspace для удаления уже выбранных приглашаемых
						 * */
						if (e.which == 8) {
							var caretPos = 0;

							if (this.selectionStart) {
								caretPos = this.selectionStart;
							} else if (document.selection) {
								this.focus();

								var r = document.selection.createRange();
								if (r == null) {
									caretPos = 0;
								}

								var re = this.createTextRange(),
									rc = re.duplicate();
								re.moveToBookmark(r.getBookmark());
								rc.setEndPoint('EndToStart', re);

								caretPos = rc.text.length;
							} else {
								caretPos = 0;
							}

							if (!caretPos) {
								var i = $(this).prev('.selected-item');
								if (!i.length) return false;

								if (i.hasClass('prepared-for-delete')) {
									i.find('i').click();
								} else {
									i.addClass('prepared-for-delete');
								}
							}
						} else {
							var i = $(this).prev('.selected-item');
							if (i.length && i.hasClass('prepared-for-delete'))
								i.removeClass('prepared-for-delete');
						}
					})
					.on('keypress.smartDropdown', function(e) {
						if (e.which == 13) {
							e.preventDefault();
							return false;
						}
					})
					.on('blur.smartDropdown', methods['blur']);

				$(window).resize(function() {
					if (!$this.data('smartDropdown').dropdownVisible)
						return false;

					methods.setPosition.apply($this);
				});

				if (typeof config.onLoad == 'function')
					config.onLoad.apply(this);
			},

			// Отрабатывает при клике на элемент выпадающего списка
			itemClick: function(e, input) {
				var data = input.data('smartDropdown'),
					item = $(this).data('item');

				if (!data.config.multiple) {
					input.val(item.name ? item.name : item.title).change();

					for (var i in data.list)
						if (i !== 'length' && data.list[i].selectedInField == data.id)
							data.list[i].yetSelected = false;

					item.yetSelected = true;
					item.selectedInField = data.id;

					input.focus();

					methods.hide.apply(input);

					var idField = $(data.config.idField);
					if (idField.length)
						idField.val(item.id);
				} else {
					var html = $('<div class="selected-item"><input type="hidden" name="' + data.config.fieldName + '[' + item.id + ']" value="' +
						(item.name ? item.name : item.title) + '" /><span>' + (item.name ? item.name : item.title) + '</span> <i></i></div>').data('item', item);

					html.find('i').on('click', function() {
						$(this).closest('.selected-item').data('item') && ($(this).closest('.selected-item').data('item').yetSelected = false);
						$(this).closest('.selected-item').fadeOut(100, function() {
							$(this).remove();
						});
					});

					input.before(html);

					item.yetSelected = true;
					item.selectedInField = data.id;

					data.dropdown.find('.hover').removeClass('hover');
					data.currentHoveredItem = -1;
					input.val('');

					methods.setPosition.apply(input);
					methods.catchKey.apply(input, [{ which: -1 }]);
				}

				// Запускаем callback
				if (typeof data.config.onItemSelect == 'function')
					data.config.onItemSelect.apply(input, [item]);
			},

			// Позиционирует выпадающий список
			setPosition: function() {
				var $this = $(this),
					data = $this.data('smartDropdown'),
					dd = data.dropdown;

				dd.css({
					left: data.config.snapTo.offset().left,
					top: data.config.snapTo.offset().top + data.config.snapTo.outerHeight() + data.config.marginTop, // был position().top
					width: data.config.snapTo.outerWidth()
				});
			},

			// Отображает выпадающий список по событиям
			show: function() {
				var $this = $(this),
					data = $this.data('smartDropdown');

				if (data.dropdownVisible) return false;

				// Item list filter
				var showCount = 0;
				for (var i in data.list)
					if (i != 'length') {
						var action = data.config.filterCallback(data.list[i], this.value, data.config) ? 'show' : 'hide';
						if (action == 'show') showCount++;

						data.itemList[i][action]();
					}

				data.dropdownVisible = true;
				data.dropdown.appendTo('body').css('visibility', showCount ? 'visible' : 'hidden').find('.borders').css('height', Math.min(showCount * 41 - 1, data.config.maxHeight)).mCustomScrollbar('update');

				data.config.snapTo[showCount ? 'removeClass' : 'addClass']('sdd-no-items');

				data.dropdown.find('.hover').removeClass('hover');
				data.currentHoveredItem = -1;

				methods.setPosition.apply(this);

				data.hiddenByUser = false;

				methods.catchKey.apply(this, [{ which: -1 }]);
			}
		};

		var args = arguments;

		return this.each(function() {
			if ((args[0] && args[0] == 'destroy') && !$(this).data('smartDropdown')) return true;

			if (!$(this).data('smartDropdown')) {
				methods['init'].apply(this, args);
			} else if (methods[options]) {
				methods[options].apply(this, Array.prototype.slice.call(args, 1));
			} else {
				$.error('Method ' + options + ' are not defined');
			}
		});
	};
})(jQuery);
