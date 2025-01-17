import isEqual from 'lodash-es/isEqual';
import {
    BehaviorSubject,
    combineLatest,
} from 'rxjs';
import {
    distinctUntilChanged,
    map,
} from 'rxjs/operators';

import { ISuggestValue } from '@uipath/angular/components/ui-suggest';

import { UiGridColumnDirective } from '../body/ui-grid-column.directive';
import {
    IDropdownOption,
    UiGridDropdownFilterDirective,
} from '../filters/ui-grid-dropdown-filter.directive';
import { UiGridSearchFilterDirective } from '../filters/ui-grid-search-filter.directive';
import { UiGridFooterDirective } from '../footer/ui-grid-footer.directive';
import { UiGridHeaderDirective } from '../header/ui-grid-header.directive';
import { IFilterModel } from '../models';

/**
 * Handles and aggregates all filters with the latest values.
 *
 * @export
 * @ignore
 * @internal
 */
export class FilterManager<T> {
    hasCustomFilter$ = new BehaviorSubject(false);
    customFilters?: IFilterModel<T>[];

    filter$ = new BehaviorSubject<IFilterModel<T>[]>([]);
    defaultValueDropdownFilters: IFilterModel<T>[] = [];

    dirty$ = this.filter$.pipe(
        map(filters =>
            !!this._initialFilters
            && !isEqual(
                this._sortByProperty(filters),
                this._sortByProperty(this._initialFilters),
            ),
        ),
        distinctUntilChanged(),
    );

    activeCount$ = combineLatest([
        this.filter$,
        this.dirty$,
    ]).pipe(
        map(([filters, dirty]) => {
            if (!dirty) {
                return 0;
            }

            return filters.filter(current =>
                !this._initialFilters?.find(initial => isEqual(initial, current)),
            ).length;
        }),
        distinctUntilChanged(),
    );

    private _initialFilters: IFilterModel<T>[] | null = null;

    constructor(
        private _columns: UiGridColumnDirective<T>[] = [],
    ) { }

    get columns() {
        return this._columns;
    }

    set columns(columns: UiGridColumnDirective<T>[]) {
        this._columns = columns;
        this._emitFilterOptions();
    }

    destroy() {
        this.filter$.complete();
    }

    searchableDropdownUpdate = (column?: UiGridColumnDirective<T>, value?: ISuggestValue, selected?: boolean) =>
        this._updateFilterValue(column, value, selected, this._mapSearchableDropdownItem);

    dropdownUpdate = (column?: UiGridColumnDirective<T>, value?: IDropdownOption) =>
        this._updateFilterValue(column, value, false, this._mapDropdownItem);

    searchChange(term: string | undefined, header: UiGridHeaderDirective<T>, footer?: UiGridFooterDirective) {
        if (term === header.searchValue) { return; }
        const searchFilterCollection: IFilterModel<T>[] = term ?
            this._columns
                .filter(column => column.searchable)
                .map(column => ({
                    property: column.queryProperty ?? column.property,
                    value: term,
                    method: column.method,
                })) as IFilterModel<T>[] :
            [];

        header.searchValue = term;
        header.searchTerm.emit(term);
        header.searchFilter.emit(searchFilterCollection);
        if (footer?.state.pageIndex) {
            footer.pageChange.emit({
                pageIndex: 0,
                pageSize: footer.state.pageSize,
            });
        }
    }

    updateCustomFilters(customValue: IFilterModel<T>[]) {
        this.customFilters = customValue;
        this.hasCustomFilter$.next(true);
        this.filter$.next(customValue);
    }

    clearCustomFilters() {
        this.hasCustomFilter$.next(false);
        this._emitFilterOptions();
    }

    clear() {
        this._columns.forEach(column => {
            const dropdown = column.dropdown ?? column.searchableDropdown;

            if (!dropdown) { return; }
            dropdown.value = undefined;
        });
    }

    private _updateFilterValue = (
        column: UiGridColumnDirective<T> | undefined,
        value: ISuggestValue | IDropdownOption | undefined,
        selected: boolean | undefined,
        mapper: (column: UiGridColumnDirective<T>) => IFilterModel<T>,
    ): void => {
        if (!column) { return; }

        const dropdown = column.dropdown ?? column.searchableDropdown;

        if (!dropdown) { return; }

        (dropdown as {
            updateValue: (value: ISuggestValue | IDropdownOption | undefined, selected: boolean | undefined) => void;
        }).updateValue(value, selected);
        dropdown.filterChange.emit(value ? mapper(column) : null);

        this._emitFilterOptions();
    };

    private _emitFilterOptions = () => {
        this.defaultValueDropdownFilters = this._columns
            .filter(({ dropdown }) => this._hasFilterValue(dropdown))
            .map(this._mapDropdownItem);

        const emptyStateDropdownFilters = this._columns
            .filter(col => col.dropdown?.emptyStateValue)
            .map(this._mapDropdownEmptyStateItem);
        const searchableFilters = this._columns
            .filter(({ searchableDropdown }) => this._hasFilterValue(searchableDropdown))
            .map(this._mapSearchableDropdownItem);

        const updatedFilters = [...this.defaultValueDropdownFilters, ...searchableFilters];
        this._initialFilters = emptyStateDropdownFilters.length
            ? emptyStateDropdownFilters
            : [];
        if (isEqual(this.filter$.getValue(), updatedFilters)) { return; }

        this.filter$.next(
            this.hasCustomFilter$.value
                ? this.customFilters!
                : updatedFilters,
        );
    };

    private _hasFilterValue = (dropdown?: UiGridSearchFilterDirective<T> | UiGridDropdownFilterDirective<T>) =>
        !!dropdown &&
        dropdown.value;

    private _mapDropdownItem = (column: UiGridColumnDirective<T>) => ({
        method: column.dropdown!.method,
        property: column.property,
        value: column.dropdown!.value!.value,
    }) as IFilterModel<T>;

    private _mapDropdownEmptyStateItem = (column: UiGridColumnDirective<T>) => ({
        method: column.dropdown!.method,
        property: column.property,
        value: column.dropdown!.emptyStateValue,
    }) as IFilterModel<T>;

    private _mapSearchableDropdownItem(column: UiGridColumnDirective<T>): IFilterModel<T> {
        return {
            method: column.searchableDropdown!.method,
            property: column.searchableDropdown!.property ?? column.property,
            value: column.searchableDropdown!.multiple ?
                (column.searchableDropdown!.value! as ISuggestValue[]).map(value => value.id)
                : (column.searchableDropdown!.value! as ISuggestValue).id,
            meta: column.searchableDropdown!.value,
        } as IFilterModel<T>;
    }

    private _sortByProperty(filters: IFilterModel<T>[]): any {
        return filters.sort((a, b) => ((a.property as string) > (b.property as string)) ? 1 : -1);
    }
}
