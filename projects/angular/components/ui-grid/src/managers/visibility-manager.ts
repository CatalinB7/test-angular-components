import isEqual from 'lodash-es/isEqual';
import { BehaviorSubject } from 'rxjs';
import {
    filter,
    map,
} from 'rxjs/operators';

import { isDevMode } from '@angular/core';

import { UiGridColumnDirective } from '../body/ui-grid-column.directive';
import {
    IGridDataEntry,
    IVisibleModel,
} from '../models';

interface IVisibleDiff {
    property: string;
    checked: boolean;
}
/**
 * @internal
 * @ignore
 */
export class VisibilityManger<T extends IGridDataEntry> {
    private _columns$ = new BehaviorSubject<UiGridColumnDirective<T>[]>([]);
    private _initial?: IVisibleDiff[];

    // eslint-disable-next-line @typescript-eslint/member-ordering
    columns$ = this._columns$.pipe(
        map(cols => cols.filter(c => !!c.visible)),
    );
    // eslint-disable-next-line @typescript-eslint/member-ordering
    options$ = this._columns$.pipe(
        map(cols => this._mapToRenderedOptions(cols)),
    );
    // eslint-disable-next-line @typescript-eslint/member-ordering
    isDirty$ = this.options$.pipe(
        filter(() => !!this._initial),
        map(o => ([o.map(this._mapToVisibleDiff), this._initial])),
        map(([current, initial]) => !isEqual(current, initial)),
    );

    set columns(columns: UiGridColumnDirective<T>[]) {
        if (!this._initial) {
            this._initial = this._mapInitial(columns);
        }

        this._columns$.next(columns);
    }

    destroy() {
        this._columns$.complete();
    }

    reset() {
        if (!this._initial) { return; }

        this.update(
            this._initial
                .filter(o => o.checked)
                .map(o => o.property),
        );
    }

    update(visibleColumnsByProps: (string | keyof T)[]) {
        // changing the visible attribute will trigger a SimpleChange Emission
        this._columns$.getValue()
            .forEach(c => c.visible = visibleColumnsByProps.includes(c.property!));
    }

    private _mapColumnOption = (column: UiGridColumnDirective<T>) => ({
        property: column.property!,
        label: column.title,
        checked: column.visible,
        disabled: column.disableToggle,
    }) as IVisibleModel<T>;

    private _mapToVisibleDiff = ({ checked, property }: IVisibleModel<T>) => ({
        property,
        checked,
    } as IVisibleDiff);

    private _mapInitial = (columns: UiGridColumnDirective<T>[]) =>
        this._mapOptions(columns).map(this._mapToVisibleDiff);

    private _mapOptions = (columns: UiGridColumnDirective<T>[]) =>
        columns
            .filter(c => c.property
                // discard locked and hidden columns from toggle-able options
                && (!c.disableToggle || c.visible),
            )
            .map(this._mapColumnOption);

    private _mapToRenderedOptions = (columns: UiGridColumnDirective<T>[]) => {
        const columnOptions = this._mapOptions(columns);

        const visibleOptions = columnOptions.filter(o => o.checked);

        // ensure at least one column is locked as visible
        if (visibleOptions.length && !visibleOptions.find(o => o.disabled)) {
            const firstColumn = columns.find(c => c.property === visibleOptions[0].property)!;

            if (isDevMode()) {
                console.warn(`Did not find column with [disableToggle]="true", locking '${firstColumn.property as string}' column`);
            }

            firstColumn.disableToggle = true;
            visibleOptions[0].disabled = true;
        }

        return columnOptions;
    };
}
