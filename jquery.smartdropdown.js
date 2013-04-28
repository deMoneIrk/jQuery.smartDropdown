(function($) {
  /**
	 * smartDropdown plugin creates a customizable dropdown from <input> tag
	 * 
	 * TODO: автоматический ресайз поля для ввода e-mail
	 * */
	$.fn.smartDropdown = function(options) {
		var methods = {
			// Скрывает поле при потере фокуса элементов
			blur: function() {
				var _this = this, $this = $(this),
					data = $(this).data('smartDropdown');

				// Если собственные элементы создавать нельзя, то нужно проверить, что значение либо совпадает
				// с одним из значений списка, либо обнулить поле
				var value = $this.val().trim(),
					ok = false;

				for (var i in data.list) {
					if ((data.list[i].name ? data.list[i].name : data.list[i].title).trim() == value) {
						ok = true;
						$(data.config.idField).val(data.list[i].id);
					}
				}

				if (!ok) {
					// Если текст не найден, и новые элементы создавать не разрешается, то поле нужно обнулить
					if (!data.config.allowNewItems) {
						$(this).val('');
					} else {
						if (data.config.multiple) {
							if (typeof data.config.newItemCheck != 'function' || data.config.newItemCheck(value)) {
								var html = $('<div class="selected-item"><input type="hidden" name="item[_new][]" value="' + value + '" />' +
									'<span>' + value + '</span> <i></i></div>');

								html.find('i').click(function() {
									$(this).closest('.selected-item').fadeOut(100, function() { $(this).remove(); });
								});

								$this.before(html);
							}
							$this.val('');
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

				if (data.list && data.list.length > 0) {
					var ul = data.dropdown.find('ul');
					ul.html('');
					for (var i in data.list) {
						data.list[i]._item = $('<li>' + data.config.itemOutput(data.list[i]) + '</li>');
						data.list[i]._item.data({
							item: data.list[i],
							index: i
						}).bind('click.smartDropdown', function(e) {
							methods.itemClick.apply(this, [e, $this]);
						}).mouseenter(function() {
							$(this).closest('ul').find('.hover').removeClass('hover');
							$(this).addClass('hover');

							$(this).closest('.smart-dropdown').data('input').data('smartDropdown').currentHoveredItem = $(this).prevAll('li').length;
						}).appendTo(ul);
					}
				}
			},

			// Отлавливает события клавиатуры и обрабатывает их, кроме того применяет фильтрацию к элементам
			catchKey: function(e) {
				var data = $(this).data('smartDropdown');

				if (e.which == 9) {
					methods.hide.apply(this);
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
						data.list[data.currentHoveredItem]._item.addClass('hover');
					} else if (e.which == 38 && data.currentHoveredItem > 0) {
						var prev = data.dropdown.find('.hover').prevAll('li:visible:first');
						if (!prev.length) return false;

						data.dropdown.find('.hover').removeClass('hover');

						data.currentHoveredItem = prev.prevAll('li').length;
						data.list[data.currentHoveredItem]._item.addClass('hover');
					} else if (e.which == 27) {
						data.hiddenByUser = true;
						methods.hide.apply(this);
					} else if (e.which == 13) {
						if (data.currentHoveredItem > -1) {
							data.dropdown.find('.hover a').click();
						} else if (data.dropdown.find('li:visible').length == 1) {
							data.dropdown.find('li:visible').click();
						} else if (data.config.allowNewItems) {
							var $this = $(this),
								value = $this.val();

							if (typeof data.config.newItemCheck == 'function' && !data.config.newItemCheck(value)) {
								$this.css('color', 'red');
								setTimeout(function() { $this.css('color', 'black'); }, 300);
								return false;
							}

							var html = $('<div class="selected-item"><input type="hidden" name="item[_new][]" value="' + value + '" />' +
								'<span>' + value + '</span> <i></i></div>');

							html.find('i').click(function() {
								$(this).closest('.selected-item').fadeOut(100, function() { $(this).remove(); });
							});

							$this.before(html);
							$this.val('');

							methods.setPosition.apply($this);
							methods.catchKey.apply($this, [{ which: -1 }]);
						}

						return false;
					}

					return false;
				}

				// Item list filter
				for (var i in data.list)
					data.list[i]._item[data.config.filterCallback(data.list[i], this.value, data.config) ? 'show' : 'hide']();

				methods.setVisibility.apply(this);

				if (!data.hiddenByUser)
					methods.show.apply(this);

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

					// Вызывается при фильтрации элементов по полям объекта
					filterCallback: function(item, query, config) {
						// Если элемент уже выбран в мультиселекте, то его больше не выводим
						if (config.multiple && item.yetSelected)
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

					// Разрешать выбирать сразу несколько элементов
					multiple: false,

					// Функция проверки корректности нового добавляемого элемента
					newItemCheck: function(text) { return true; },

					// Поля исходного объекта, по которым можно производить поиск при вводе текста
					searchFields: ['name', 'title'],

					// Можно указать, к какому конкретно элементу привязывать выпадающий список
					snapTo: false,
					snappingToOtherObject: false, // флаг того, что мы привязываемся к чужому объекту

					// Количество выводимых на экран элементов
					visibleCount: 5
				}, config);

				var $this = $(this),
					data = $this.data('smartDropdown');

				if (!config.snapTo)
					config.snapTo = $this;
				else
					config.snappingToOtherObject = true;

				if (data)
					return true;

				for (var i in config.list) {
					if (typeof config.list[i] == 'string')
						config.list[i] = {name: config.list[i]};

					config.list[i].yetSelected = false;
				}

				data = {
					id: 'sdd' + Math.random(),
					config: config,
					currentHoveredItem: -1,
					dropdown: $('<div class="smart-dropdown' + (config.dropdownClass ? ' ' + config.dropdownClass : '') + '"><ul></ul></div>'),
					hiddenByUser: false,
					list: config.list
				};

				$this.data('id', data.id);
				data.dropdown.data('input', $this);

				$this.data('smartDropdown', data);
				methods.build.apply(this);
				methods.setVisibility.apply(this);

				if (config.snappingToOtherObject)
					config.snapTo.bind('click.smartDropdown', function(e) {
						if ($(e.target).hasClass('selected-item') || $(e.target).closest('.selected-item').length)
							return false;

						if ($this.data('smartDropdown').dropdownVisible)
							return false;

						$this.focus();
					});

				$this
					.bind('focus.smartDropdown', methods['show'])
					.bind('keyup.smartDropdown', methods['catchKey'])
					.bind('keydown.smartDropdown', function(e) {
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
					.bind('keypress.smartDropdown', function(e) {
						if (e.which == 13) {
							e.preventDefault();
							return false;
						}
					})
					.bind('blur.smartDropdown', methods['blur']);
			},

			// Отрабатывает при клике на элемент выпадающего списка
			itemClick: function(e, input) {
				var data = input.data('smartDropdown'),
					item = $(this).data('item');

				if (!data.config.multiple) {
					input.val(item.name ? item.name : item.title);
					input.focus();

					methods.hide.apply(input);

					var idField = $(data.config.idField);
					if (idField.length)
						idField.val(item.id);
				} else {
					var html = $('<div class="selected-item"><input type="hidden" name="item[' + item.id + ']" value="' + (item.name ? item.name : item.title) + '" />' +
						'<span>' + (item.name ? item.name : item.title) + '</span> <i></i></div>').data('item', item);

					html.find('i').click(function() {
						$(this).closest('.selected-item').data('item').yetSelected = false;
						$(this).closest('.selected-item').fadeOut(100, function() {
							$(this).remove();
						});
					});

					input.before(html);

					item.yetSelected = true;
					data.dropdown.find('.hover').removeClass('hover');
					data.currentHoveredItem = -1;
					input.val('');

					methods.setPosition.apply(input);
					methods.catchKey.apply(input, [{ which: -1 }]);
				}
			},

			// Позиционирует выпадающий список
			setPosition: function() {
				var $this = $(this),
					data = $this.data('smartDropdown'),
					dd = data.dropdown;

				// console.log('setPosition', data.config.snapTo.position().top, data.config.snapTo.outerHeight());

				dd.css({
					left: data.config.snapTo.position().left,
					top: data.config.snapTo.position().top + data.config.snapTo.outerHeight() + data.config.marginTop,
					width: data.config.snapTo.outerWidth()
				});
			},

			// Скрывает те элементы списка, которых больше, чем config.visibilityCount
			setVisibility: function() {
				var $this = $(this),
					data = $this.data('smartDropdown'),
					vCount = 0;

				for (var i in data.list) {
					if (data.list[i]._item.css('display') != 'none') {
						vCount++;
						if (vCount > data.config.visibleCount)
							data.list[i]._item.hide();
					}
				}
			},

			// Отображает выпадающий список по событиям
			show: function() {
				var $this = $(this),
					data = $this.data('smartDropdown');

				if (data.dropdownVisible) return false;

				data.dropdownVisible = true;
				data.dropdown.appendTo('body');

				data.dropdown.find('.hover').removeClass('hover');
				data.currentHoveredItem = -1;

				methods.setPosition.apply(this);

				data.hiddenByUser = false;

				methods.catchKey.apply(this, [{ which: -1 }]);
			}
		};

		var args = arguments;

		return this.each(function() {
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
