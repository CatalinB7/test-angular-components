import * as faker from 'faker';
import isArray from 'lodash-es/isArray';
import { BehaviorSubject } from 'rxjs';
import {
    finalize,
    first,
    skip,
    take,
    toArray,
} from 'rxjs/operators';

import { UiGridFooterDirective } from '@uipath/angular/components/ui-grid';
import { ISuggestValue } from '@uipath/angular/components/ui-suggest';

import { UiGridColumnDirective } from '../body/ui-grid-column.directive';
import { IDropdownOption } from '../filters/ui-grid-dropdown-filter.directive';
import { UiGridHeaderDirective } from '../header/ui-grid-header.directive';
import { FilterManager } from '../managers';
import {
    generateColumn,
    generateDropdownFilter,
    generateListFactory,
    generateSearchFilterDefinition,
    ISearchableDropdownFilterDefinition,
    ITestEntity,
} from '../test';

interface ITestColumnOptionDefinition<T> {
    column: UiGridColumnDirective<T>;
    option: IDropdownOption;
}

const dropdownToFilterOptionDefinition = <T>(column: UiGridColumnDirective<T>): ITestColumnOptionDefinition<T> => ({
    column,
    option: faker.helpers.randomize(column.dropdown!.items!),
});

interface ITestSearchableColumnOptionDefinition<T> {
    column: UiGridColumnDirective<T>;
    option: ISuggestValue;
}

const searchableDropdownToFilterOptionDefinition = <T>(
    column: UiGridColumnDirective<T>,
    searchFilterDefinitions: ISearchableDropdownFilterDefinition<T>[],
): ITestSearchableColumnOptionDefinition<T> => ({
    column,
    option: faker.helpers.randomize(searchFilterDefinitions.find(x => x.dropdown === column.searchableDropdown)!.items),
});

describe('Component: UiGrid', () => {
    const generateColumnList = generateListFactory(generateColumn);

    describe('Manager: FilterManager', () => {
        let manager: FilterManager<ITestEntity>;

        beforeEach(() => {
            manager = new FilterManager<ITestEntity>();
        });

        describe('State: initial', () => {
            it('should have column length 0', () => {
                expect(manager.columns.length).toEqual(0);
            });

            it('should expose a filter stream of type behavior subject', () => {
                expect(manager.filter$.constructor).toBe(BehaviorSubject);
            });

            it('should expose a filter stream with initial value an empty array', () => {
                const initialValue = manager.filter$.getValue();
                expect(isArray(initialValue)).toBe(true);
                expect(initialValue.length).toBe(0);
            });
        });

        describe('State: columns configured', () => {
            let columns: UiGridColumnDirective<ITestEntity>[];

            beforeEach(() => {
                columns = generateColumnList('random');
                manager.columns = columns;
            });

            it('should update the collection', () => {
                expect(manager.columns.length).toEqual(columns.length);
                expect(manager.columns).toBe(columns);
            });

            describe('Event: search change', () => {
                const header = new UiGridHeaderDirective<ITestEntity>();

                it('should emit filters for searchable columns only', (done) => {
                    header.searchFilter
                        .pipe(
                            first(),
                            finalize(done),
                        )
                        .subscribe(filters => expect(filters.length).toEqual(columns.filter(c => c.searchable).length));

                    manager.searchChange('a', header);
                });

                it('should emit the search term via the header subject', (done) => {
                    header.searchTerm
                        .pipe(
                            first(),
                            finalize(done),
                        )
                        .subscribe(term => {
                            expect(term).toEqual('b');
                        });

                    manager.searchChange('b', header);
                });

                it('should emit the filter collection via the header subject', (done) => {
                    header.searchFilter
                        .pipe(
                            first(),
                            finalize(done),
                        )
                        .subscribe(filters => {
                            filters.forEach(filter => {
                                expect(filter).toBeDefined();

                                const column = columns.find(c => c.property === filter.property);
                                expect(column).toBeDefined();

                                expect(filter.method).toEqual(column!.method!, {
                                    column,
                                    filter,
                                    msg: 'The filter associated to the requested column is invalid!',
                                });
                            });
                        });

                    manager.searchChange('c', header);
                });

                it('should not set page index to 0 for same search term', () => {
                const footer = new UiGridFooterDirective();
                const footerEmitSpy = spyOn(footer.pageChange, 'emit');
                    manager.searchChange('d', header, footer);
                    expect(footerEmitSpy).toHaveBeenCalledTimes(0);
                });

                it('should set page index to 0 for different search term', (done) => {
                    const footer = new UiGridFooterDirective();
                    footer.state.pageIndex = 2;
                    const footerEmitSpy = spyOn(footer.pageChange, 'emit').and.callThrough();

                        footer.pageChange
                            .pipe(
                                first(),
                                finalize(done),
                            )
                            .subscribe((pageChange) => expect(pageChange.pageIndex).toEqual(0));

                        manager.searchChange('e', header, footer);
                        expect(footerEmitSpy).toHaveBeenCalledTimes(1);
                    });
            });

            describe('Event: filter change', () => {
                let columnWithSearchableList: UiGridColumnDirective<ITestEntity>[];

                describe('FilterType: dropdown', () => {
                    beforeEach(() => {
                        columnWithSearchableList = generateColumnList('random');
                        columnWithSearchableList.forEach(column => column.dropdown = generateDropdownFilter());

                        manager.columns = columnWithSearchableList;
                    });

                    it('should emit the filter change via the dropdown subject', (done) => {
                        const columnOptionDefinition = dropdownToFilterOptionDefinition(faker.helpers.randomize(columnWithSearchableList));

                        columnOptionDefinition
                            .column!
                            .dropdown!
                            .filterChange
                            .pipe(
                                first(),
                                finalize(done),
                            )
                            .subscribe(filter => {
                                expect(filter).toBeDefined();
                                expect(filter!.value).toEqual(columnOptionDefinition.option.value);
                                expect(filter!.method).toBe(columnOptionDefinition.column.dropdown!.method!);
                            });

                        manager.dropdownUpdate(columnOptionDefinition.column, columnOptionDefinition.option);
                    });

                    it('should emit the filter list when ONE change occurs', (done) => {
                        const columnOptionDefinition = dropdownToFilterOptionDefinition(faker.helpers.randomize(columnWithSearchableList));

                        manager.filter$.pipe(
                            skip(1),
                            take(1),
                            finalize(done),
                        ).subscribe(filters => {
                            const [filter] = filters;

                            expect(filter).toBeDefined();
                            expect(filter.value).toEqual(columnOptionDefinition.option.value);
                            expect(filter.method).toBe(columnOptionDefinition.column.dropdown!.method!);
                        });

                        manager.dropdownUpdate(columnOptionDefinition.column, columnOptionDefinition.option);
                    });

                    it('should emit the filter list when MULTIPLE changes occur', (done) => {
                        const columnOptionDefinitionList = columnWithSearchableList
                            .filter((_, idx) => idx % 2)
                            .map(dropdownToFilterOptionDefinition);

                        manager.filter$.pipe(
                            skip(1),
                            take(columnOptionDefinitionList.length),
                            toArray(),
                            finalize(done),
                        ).subscribe(emissionList => {
                            expect(emissionList.length).toEqual(columnOptionDefinitionList.length);

                            emissionList.forEach((filters, emissionIdx) => {
                                expect(filters.length).toEqual(emissionIdx + 1);

                                filters.forEach((filter, idx) => {
                                    const columnOptionDefinition = columnOptionDefinitionList[idx];

                                    expect(filter).toBeDefined();
                                    expect(filter.value).toEqual(columnOptionDefinition.option.value);
                                    expect(filter.method).toBe(columnOptionDefinition.column.dropdown!.method!);
                                });
                            });
                        });

                        columnOptionDefinitionList
                            .forEach(
                                columnOptionDefinition => manager.dropdownUpdate(
                                    columnOptionDefinition.column,
                                    columnOptionDefinition.option,
                                ),
                            );
                    });
                });

                describe('FilterType: searchable dropdown', () => {
                    let searchableDropdownItemList: ISearchableDropdownFilterDefinition<ITestEntity>[];

                    beforeEach(() => {
                        searchableDropdownItemList = [];

                        columnWithSearchableList = generateColumnList('random');
                        columnWithSearchableList.forEach(column => {
                            const defintion = generateSearchFilterDefinition();
                            column.searchableDropdown = defintion.dropdown;
                            searchableDropdownItemList.push(defintion);
                        });

                        manager.columns = columnWithSearchableList;
                    });

                    it('should emit the filter change via the dropdown subject', (done) => {
                        const columnOptionDefinition = searchableDropdownToFilterOptionDefinition(
                            faker.helpers.randomize(columnWithSearchableList),
                            searchableDropdownItemList,
                        );

                        columnOptionDefinition
                            .column!
                            .searchableDropdown!
                            .filterChange
                            .pipe(
                                first(),
                                finalize(done),
                            )
                            .subscribe(filter => {
                                expect(filter).toBeDefined();
                                expect(filter!.value).toEqual(columnOptionDefinition.option.id);
                                expect(filter!.method).toBe(columnOptionDefinition.column.searchableDropdown!.method!);
                                expect(filter!.meta).toEqual(columnOptionDefinition.option);
                            });

                        manager.searchableDropdownUpdate(columnOptionDefinition.column, columnOptionDefinition.option);
                    });

                    it('should emit the filter list when ONE change occurs', (done) => {
                        const columnOptionDefinition = searchableDropdownToFilterOptionDefinition(
                            faker.helpers.randomize(columnWithSearchableList),
                            searchableDropdownItemList,
                        );

                        manager.filter$.pipe(
                            skip(1),
                            take(1),
                            finalize(done),
                        ).subscribe(filters => {
                            const [filter] = filters;

                            expect(filter).toBeDefined();
                            expect(filter.value).toEqual(columnOptionDefinition.option.id);
                            expect(filter.method).toBe(columnOptionDefinition.column.searchableDropdown!.method!);
                            expect(filter.meta).toEqual(columnOptionDefinition.option);
                        });

                        manager.searchableDropdownUpdate(columnOptionDefinition.column, columnOptionDefinition.option);
                    });

                    it('should emit the filter list when MULTIPLE changes occur', (done) => {
                        const columnOptionDefinitionList = columnWithSearchableList
                            .filter((_, idx) => idx % 2)
                            .map(column => searchableDropdownToFilterOptionDefinition(column, searchableDropdownItemList));

                        manager.filter$.pipe(
                            skip(1),
                            take(columnOptionDefinitionList.length),
                            toArray(),
                            finalize(done),
                        ).subscribe(emissionList => {
                            expect(emissionList.length).toEqual(columnOptionDefinitionList.length);

                            emissionList.forEach((filters, emissionIdx) => {
                                expect(filters.length).toEqual(emissionIdx + 1);

                                filters.forEach((filter, idx) => {
                                    const columnOptionDefinition = columnOptionDefinitionList[idx];

                                    expect(filter).toBeDefined();
                                    expect(filter.value).toEqual(columnOptionDefinition.option.id);
                                    expect(filter.method).toBe(columnOptionDefinition.column.searchableDropdown!.method!);
                                    expect(filter.meta).toEqual(columnOptionDefinition.option);
                                });
                            });
                        });

                        columnOptionDefinitionList
                            .forEach(
                                columnOptionDefinition => manager.searchableDropdownUpdate(
                                    columnOptionDefinition.column,
                                    columnOptionDefinition.option,
                                ),
                            );
                    });
                });

                describe('FilterType: multiple searchable dropdown', () => {
                    let searchableDropdownItemList: ISearchableDropdownFilterDefinition<ITestEntity>[];

                    beforeEach(() => {
                        searchableDropdownItemList = [];

                        columnWithSearchableList = generateColumnList('random');
                        columnWithSearchableList.forEach(column => {
                            const defintion = generateSearchFilterDefinition(true);
                            column.searchableDropdown = defintion.dropdown;
                            searchableDropdownItemList.push(defintion);
                        });

                        manager.columns = columnWithSearchableList;
                    });

                    it('should emit the list value of the filter when ONE option is selected', (done) => {
                        const columnOptionDefinition = searchableDropdownToFilterOptionDefinition(
                            faker.helpers.randomize(columnWithSearchableList),
                            searchableDropdownItemList,
                        );

                        manager.filter$.pipe(
                            skip(1),
                            take(1),
                            finalize(done),
                        ).subscribe(filters => {
                            const [filter] = filters;

                            expect(filter).toBeDefined();
                            expect(Array.isArray(filter.value)).toEqual(true);
                            expect(filter.value).toEqual([columnOptionDefinition.option.id] as unknown as []);
                            expect(filter.method).toBe(columnOptionDefinition.column.searchableDropdown!.method!);
                            expect(filter.meta).toEqual([columnOptionDefinition.option]);
                        });

                        manager.searchableDropdownUpdate(columnOptionDefinition.column, columnOptionDefinition.option, true);
                    });

                    it('should emit empty list if the value is deselected', (done) => {
                        const columnOptionDefinition = searchableDropdownToFilterOptionDefinition(
                            faker.helpers.randomize(columnWithSearchableList),
                            searchableDropdownItemList,
                        );

                        manager.filter$.pipe(
                            skip(2),
                            take(1),
                            finalize(done),
                        ).subscribe(filters => {
                            const [filter] = filters;

                            expect(filter).toBeDefined();
                            expect(Array.isArray(filter.value)).toEqual(true);
                            expect(filter.value).toEqual([]);
                            expect(filter.method).toBe(columnOptionDefinition.column.searchableDropdown!.method!);
                        });

                        manager.searchableDropdownUpdate(columnOptionDefinition.column, columnOptionDefinition.option, true);
                        manager.searchableDropdownUpdate(columnOptionDefinition.column, columnOptionDefinition.option, false);
                    });

                    it('should emit the list value of the filter with ALL selected values', (done) => {
                        const columnOptionDefinition1 = searchableDropdownToFilterOptionDefinition(
                            faker.helpers.randomize(columnWithSearchableList),
                            searchableDropdownItemList,
                        );

                        let columnOptionDefinition2 = searchableDropdownToFilterOptionDefinition(
                            faker.helpers.randomize(columnWithSearchableList),
                            searchableDropdownItemList,
                        );

                        while (columnOptionDefinition1.option === columnOptionDefinition2.option) {
                            columnOptionDefinition2 = searchableDropdownToFilterOptionDefinition(
                                faker.helpers.randomize(columnWithSearchableList),
                                searchableDropdownItemList,
                            );
                        }

                        columnOptionDefinition2.column = columnOptionDefinition1.column;

                        manager.filter$.pipe(
                            skip(2),
                            take(1),
                            finalize(done),
                        ).subscribe(filters => {
                            const [filter] = filters;

                            expect(filter).toBeDefined();
                            expect(Array.isArray(filter.value)).toEqual(true);
                            expect(filter.value).toEqual(
                                [columnOptionDefinition1.option.id, columnOptionDefinition2.option.id] as unknown as []);
                            expect(filter.method).toBe(columnOptionDefinition1.column.searchableDropdown!.method!);
                        });

                        manager.searchableDropdownUpdate(columnOptionDefinition1.column, columnOptionDefinition1.option, true);
                        manager.searchableDropdownUpdate(columnOptionDefinition2.column, columnOptionDefinition2.option, true);
                    });
                });
            });
        });
    });
});
