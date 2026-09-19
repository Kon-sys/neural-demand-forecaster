import type { Department, Position } from '../app/store-context'

export const initialDepartments: Department[] = [
    { id: 'dep-development', name: 'Отдел разработки', isActive: true },
    { id: 'dep-sales', name: 'Отдел продаж', isActive: true },
    { id: 'dep-marketing', name: 'Отдел маркетинга', isActive: true },
    { id: 'dep-analytics', name: 'Отдел аналитики', isActive: true },
    { id: 'dep-administration', name: 'Администрация', isActive: true },
]

export const initialPositions: Position[] = [
    { id: 'pos-junior-developer', name: 'Junior Developer', departmentId: 'dep-development', isActive: true },
    { id: 'pos-middle-developer', name: 'Middle Developer', departmentId: 'dep-development', isActive: true },
    { id: 'pos-senior-developer', name: 'Senior Developer', departmentId: 'dep-development', isActive: true },
    { id: 'pos-business-analyst', name: 'Business Analyst', departmentId: 'dep-analytics', isActive: true },
    { id: 'pos-data-analyst', name: 'Data Analyst', departmentId: 'dep-analytics', isActive: true },
    { id: 'pos-project-manager', name: 'Project Manager', departmentId: 'dep-marketing', isActive: true },
    { id: 'pos-product-manager', name: 'Product Manager', departmentId: 'dep-sales', isActive: true },
    { id: 'pos-administrator', name: 'Administrator', departmentId: 'dep-administration', isActive: true },
]
