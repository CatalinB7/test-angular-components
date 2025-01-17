import { A11yModule } from '@angular/cdk/a11y';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { UiAutoAccessibleLabelModule } from '@uipath/angular/a11y';
import { UiSuggestModule } from '@uipath/angular/components/ui-suggest';
import { UiCustomMatMenuTriggerModule } from '@uipath/angular/directives/custom-mat-menu-trigger';
import { UiNgLetModule } from '@uipath/angular/directives/ui-ng-let';
import { UiVirtualScrollViewportResizeModule } from '@uipath/angular/directives/ui-virtual-scroll-viewport-resize';

import { UiGridColumnDirective } from './body/ui-grid-column.directive';
import { UiGridExpandedRowDirective } from './body/ui-grid-expanded-row.directive';
import { UiGridLoadingDirective } from './body/ui-grid-loading.directive';
import { UiGridNoContentDirective } from './body/ui-grid-no-content.directive';
import { UiGridRowActionDirective } from './body/ui-grid-row-action.directive';
import { UiGridRowConfigDirective } from './body/ui-grid-row-config.directive';
import { UiGridRowCardViewDirective } from './body/ui-grid-row-card-view.directive';
import { UiGridCustomPaginatorModule } from './components/ui-grid-custom-paginator/ui-grid-custom-paginator.module';
import { UiGridSearchModule } from './components/ui-grid-search/ui-grid-search.module';
import { UiGridToggleColumnsModule } from './components/ui-grid-toggle-columns/ui-grid-toggle-columns.module';
import { UiGridDropdownFilterDirective } from './filters/ui-grid-dropdown-filter.directive';
import { UiGridSearchFilterDirective } from './filters/ui-grid-search-filter.directive';
import { UiGridFooterDirective } from './footer/ui-grid-footer.directive';
import { UiGridHeaderButtonDirective } from './header/ui-grid-header-button.directive';
import { UiGridHeaderDirective } from './header/ui-grid-header.directive';
import { UiGridComponent } from './ui-grid.component';

@NgModule({
    imports: [
        CommonModule,
        MatPaginatorModule,
        MatCheckboxModule,
        MatButtonModule,
        MatIconModule,
        MatMenuModule,
        MatSelectModule,
        MatTooltipModule,
        MatProgressBarModule,
        ScrollingModule,
        UiGridSearchModule,
        UiGridToggleColumnsModule,
        UiGridCustomPaginatorModule,
        UiSuggestModule,
        A11yModule,
        UiVirtualScrollViewportResizeModule,
        UiAutoAccessibleLabelModule,
        UiNgLetModule,
        UiCustomMatMenuTriggerModule,
    ],
    declarations: [
        UiGridComponent,
        UiGridRowActionDirective,
        UiGridColumnDirective,
        UiGridHeaderDirective,
        UiGridHeaderButtonDirective,
        UiGridFooterDirective,
        UiGridSearchFilterDirective,
        UiGridDropdownFilterDirective,
        UiGridRowConfigDirective,
        UiGridExpandedRowDirective,
        UiGridNoContentDirective,
        UiGridLoadingDirective,
        UiGridRowCardViewDirective,
    ],
    exports: [
        UiGridComponent,
        UiGridRowActionDirective,
        UiGridColumnDirective,
        UiGridHeaderDirective,
        UiGridHeaderButtonDirective,
        UiGridFooterDirective,
        UiGridSearchFilterDirective,
        UiGridDropdownFilterDirective,
        UiGridRowConfigDirective,
        UiGridExpandedRowDirective,
        UiGridNoContentDirective,
        UiGridLoadingDirective,
        UiGridRowCardViewDirective,
    ],
})
export class UiGridModule { }
