# 🚀 Angular Foundation: Modern Implementation Guide

> **Latest Angular 18+ patterns with signals, input functions, and enterprise-grade architecture**

## 📋 **Table of Contents**

1. [Modern Angular Setup](#-modern-angular-setup)
2. [Signal-Based Authentication](#-signal-based-authentication)
3. [Reactive State Management](#-reactive-state-management)
4. [Modern HTTP Patterns](#-modern-http-patterns)
5. [Signal-Driven Components](#-signal-driven-components)
6. [Advanced Reactive Patterns](#-advanced-reactive-patterns)
7. [Modern Testing Approaches](#-modern-testing-approaches)

---

## 🚀 **Modern Angular Setup**

### **1. Latest Bootstrap Configuration**

```typescript
// main.ts - Modern Angular 18+ bootstrap
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';

import {
  // Configuration tokens
  BASE_COMPONENT_CONFIG,
  HTTP_CONFIG,
  ERROR_LOGGING_CONFIG,
  AUTH_INTERCEPTOR_CONFIG,
  
  // Interceptors
  authInterceptor,
  errorHandlingInterceptor,
  
  // Token providers
  TokenProviders
} from '@fourfold/angular-foundation';

import { AppComponent } from './app/app.component';
import { appRoutes } from './app/app.routes';
import { environment } from './environments/environment';

bootstrapApplication(AppComponent, {
  providers: [
    // ✨ Latest: Zoneless change detection
    provideExperimentalZonelessChangeDetection(),
    
    // ✨ Latest: Router with input binding
    provideRouter(appRoutes, withComponentInputBinding()),
    
    // HTTP with modern interceptors
    provideHttpClient(
      withInterceptors([
        authInterceptor,
        errorHandlingInterceptor
      ])
    ),
    
    // Firebase
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideFirestore(() => getFirestore()),
    
    // Foundation library configuration
    {
      provide: HTTP_CONFIG,
      useValue: {
        baseUrl: environment.apiUrl,
        timeout: 30000,
        retries: 3
      }
    },
    
    {
      provide: AUTH_INTERCEPTOR_CONFIG,
      useValue: {
        tokenProvider: TokenProviders.localStorage('auth_token'),
        excludedUrls: ['/api/public/**', '/api/auth/**']
      }
    }
  ]
});
```

### **2. Modern Route Configuration**

```typescript
// app.routes.ts - Using latest routing patterns
import { Routes } from '@angular/router';
import { 
  authGuard, 
  roleGuard, 
  permissionGuard, 
  guestGuard 
} from '@fourfold/angular-foundation';

export const appRoutes: Routes = [
  // ✨ Modern: Route inputs automatically bound to component signals
  {
    path: 'user/:id',
    component: UserDetailComponent, // id automatically becomes input signal
    canActivate: [authGuard]
  },
  
  // ✨ Modern: Lazy loading with signal inputs
  {
    path: 'admin',
    loadComponent: () => import('./admin/admin.component').then(c => c.AdminComponent),
    canActivate: [roleGuard(['admin'])]
  },
  
  // ✨ Modern: Feature-based lazy loading
  {
    path: 'dashboard',
    loadChildren: () => import('./dashboard/dashboard.routes').then(r => r.dashboardRoutes),
    canActivate: [authGuard]
  }
];
```

---

## 🔐 **Signal-Based Authentication**

### **1. Modern Auth Service with Signals**

```typescript
// services/auth.service.ts - Pure signals architecture
import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { Router } from '@angular/router';
import { rxResource } from '@angular/core/rxjs-interop';

import {
  IReactiveAuthService,
  AuthState,
  AuthResponse,
  LoginPayload
} from '@fourfold/angular-foundation';

export interface User {
  id: string;
  email: string;
  name: string;
  roles: string[];
  permissions: string[];
  avatar?: string;
  emailVerified: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthService implements IReactiveAuthService<User> {
  private readonly router = inject(Router);
  
  // ✨ Modern: Pure signal state
  private readonly _user = signal<User | null>(null);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  
  // ✨ Modern: Public readonly signals
  readonly userSignal = this._user.asReadonly();
  readonly loadingSignal = this._loading.asReadonly();
  readonly errorSignal = this._error.asReadonly();
  readonly isAuthenticatedSignal = computed(() => !!this._user());
  
  // ✨ Modern: Computed derived state
  readonly userRoles = computed(() => this._user()?.roles ?? []);
  readonly userPermissions = computed(() => this._user()?.permissions ?? []);
  readonly isEmailVerified = computed(() => this._user()?.emailVerified ?? false);
  
  // ✨ Modern: Resource for token validation
  private readonly tokenValidation = rxResource({
    request: () => this.getToken(),
    loader: ({ request: token }) => {
      if (!token) return Promise.resolve(null);
      return this.validateToken(token);
    }
  });

  constructor() {
    // ✨ Modern: Effect for token validation reactivity
    effect(() => {
      const result = this.tokenValidation.value();
      if (result) {
        this._user.set(result);
      } else if (this.tokenValidation.error()) {
        this.clearAuthenticatedUser();
      }
    });
    
    // ✨ Modern: Effect for storage persistence
    effect(() => {
      const user = this._user();
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
      } else {
        localStorage.removeItem('user');
      }
    });
  }

  // Synchronous state queries
  isAuthenticated(): boolean {
    return this.isAuthenticatedSignal();
  }

  getUser(): User | null {
    return this._user();
  }

  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  isLoading(): boolean {
    return this._loading();
  }

  getError(): string | null {
    return this._error();
  }

  // ✨ Modern: Async with signal updates
  async loginWithEmail(payload: LoginPayload): Promise<AuthResponse<User>> {
    this._loading.set(true);
    this._error.set(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const authResponse: AuthResponse<User> = await response.json();
      
      if (authResponse.success) {
        this.setAuthenticatedUser(authResponse.user, authResponse.token);
      }

      return authResponse;
    } catch (error: any) {
      this._error.set(error.message || 'Login failed');
      throw error;
    } finally {
      this._loading.set(false);
    }
  }

  async logout(): Promise<void> {
    this._loading.set(true);
    
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.getToken()}` }
      });
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      this.clearAuthenticatedUser();
      this._loading.set(false);
      this.router.navigate(['/login']);
    }
  }

  // ✨ Modern: Signal-based RBAC
  hasRole = computed(() => (role: string) => 
    this.userRoles().includes(role)
  );

  hasPermission = computed(() => (permission: string) => 
    this.userPermissions().includes(permission)
  );

  getUserRoles(): string[] {
    return this.userRoles();
  }

  getUserPermissions(): string[] {
    return this.userPermissions();
  }

  // Private helpers
  private async validateToken(token: string): Promise<User | null> {
    const response = await fetch('/api/auth/validate', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error('Token validation failed');
    }

    return response.json();
  }

  private setAuthenticatedUser(user: User, token: string): void {
    this._user.set(user);
    localStorage.setItem('auth_token', token);
  }

  private clearAuthenticatedUser(): void {
    this._user.set(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
  }

  // ✨ Modern: Not needed - using signals instead
  // No Observable properties needed - signals replace them all
}
```

### **2. Modern Auth Guard Usage**

```typescript
// guards/modern-auth.guard.ts - Using latest patterns
import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

// ✨ Modern: Functional guard with signals
export const modernAuthGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  
  // ✨ Direct signal access - no subscriptions needed
  return authService.isAuthenticatedSignal();
};

// ✨ Modern: Permission guard factory with signals
export const modernPermissionGuard = (permissions: string[]) => {
  const guard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    
    if (!authService.isAuthenticatedSignal()) {
      return false;
    }
    
    const userPermissions = authService.userPermissions();
    return permissions.every(permission => 
      userPermissions.includes(permission)
    );
  };
  
  return guard;
};
```

---

## 🏪 **Reactive State Management**

### **1. Modern Store with Pure Signals**

```typescript
// stores/todo.store.ts - Latest patterns
import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { BaseStore } from '@fourfold/angular-foundation';
import { TodoService } from '../services/todo.service';

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

@Injectable({ providedIn: 'root' })
export class TodoStore extends BaseStore<Todo> {
  private readonly todoService = inject(TodoService);

  // ✨ Modern: Signal-based filters
  private readonly _searchTerm = signal('');
  private readonly _priorityFilter = signal<Todo['priority'] | null>(null);
  private readonly _tagFilter = signal<string | null>(null);
  private readonly _showCompleted = signal(true);

  // ✨ Modern: Computed filtered data
  readonly filteredTodos = computed(() => {
    let todos = this.data();
    const search = this._searchTerm().toLowerCase();
    const priority = this._priorityFilter();
    const tag = this._tagFilter();
    const showCompleted = this._showCompleted();

    if (search) {
      todos = todos.filter(todo => 
        todo.text.toLowerCase().includes(search)
      );
    }

    if (priority) {
      todos = todos.filter(todo => todo.priority === priority);
    }

    if (tag) {
      todos = todos.filter(todo => todo.tags.includes(tag));
    }

    if (!showCompleted) {
      todos = todos.filter(todo => !todo.completed);
    }

    return todos;
  });

  // ✨ Modern: Computed statistics
  readonly todoStats = computed(() => {
    const todos = this.data();
    const filtered = this.filteredTodos();
    
    return {
      total: todos.length,
      completed: todos.filter(t => t.completed).length,
      pending: todos.filter(t => !t.completed).length,
      filtered: filtered.length,
      byPriority: {
        high: todos.filter(t => t.priority === 'high').length,
        medium: todos.filter(t => t.priority === 'medium').length,
        low: todos.filter(t => t.priority === 'low').length
      }
    };
  });

  // ✨ Modern: Computed available options
  readonly availableTags = computed(() => 
    [...new Set(this.data().flatMap(todo => todo.tags))].sort()
  );

  readonly availablePriorities = computed(() => 
    ['low', 'medium', 'high'] as const
  );

  constructor() {
    super();
    
    // ✨ Modern: Effect for auto-save filters to localStorage
    effect(() => {
      const filters = {
        searchTerm: this._searchTerm(),
        priorityFilter: this._priorityFilter(),
        tagFilter: this._tagFilter(),
        showCompleted: this._showCompleted()
      };
      localStorage.setItem('todo-filters', JSON.stringify(filters));
    });
  }

  protected async fetchData(): Promise<Todo[]> {
    return this.todoService.getTodos();
  }

  // ✨ Modern: Filter setters
  setSearchTerm = (term: string) => this._searchTerm.set(term);
  setPriorityFilter = (priority: Todo['priority'] | null) => this._priorityFilter.set(priority);
  setTagFilter = (tag: string | null) => this._tagFilter.set(tag);
  setShowCompleted = (show: boolean) => this._showCompleted.set(show);

  clearFilters = () => {
    this._searchTerm.set('');
    this._priorityFilter.set(null);
    this._tagFilter.set(null);
    this._showCompleted.set(true);
  };

  // ✨ Modern: CRUD with optimistic updates
  async createTodo(text: string, priority: Todo['priority'] = 'medium', tags: string[] = []): Promise<Todo> {
    const optimisticTodo: Todo = {
      id: crypto.randomUUID(),
      text,
      priority,
      tags,
      completed: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Optimistic update
    this.addItem(optimisticTodo);

    try {
      const newTodo = await this.todoService.create({ text, priority, tags });
      // Replace optimistic with real
      this.updateItem(todo => todo.id === optimisticTodo.id, newTodo);
      return newTodo;
    } catch (error) {
      // Revert optimistic update
      this.removeItem(todo => todo.id === optimisticTodo.id);
      throw error;
    }
  }

  async toggleTodo(id: string): Promise<void> {
    const todo = this.get(id);
    if (!todo) return;

    const updates = { completed: !todo.completed, updatedAt: new Date() };
    
    // Optimistic update
    this.updateItem(t => t.id === id, updates);

    try {
      await this.todoService.update(id, updates);
    } catch (error) {
      // Revert
      this.updateItem(t => t.id === id, { completed: todo.completed });
      throw error;
    }
  }

  async updateTodoPriority(id: string, priority: Todo['priority']): Promise<void> {
    const updates = { priority, updatedAt: new Date() };
    
    this.updateItem(t => t.id === id, updates);

    try {
      await this.todoService.update(id, updates);
    } catch (error) {
      await this.load(); // Full reload on error
      throw error;
    }
  }

  async addTagToTodo(id: string, tag: string): Promise<void> {
    const todo = this.get(id);
    if (!todo || todo.tags.includes(tag)) return;

    const newTags = [...todo.tags, tag];
    const updates = { tags: newTags, updatedAt: new Date() };
    
    this.updateItem(t => t.id === id, updates);

    try {
      await this.todoService.update(id, updates);
    } catch (error) {
      await this.load();
      throw error;
    }
  }

  async deleteTodo(id: string): Promise<void> {
    const todo = this.get(id);
    if (!todo) return;

    // Optimistic delete
    this.removeItem(t => t.id === id);

    try {
      await this.todoService.delete(id);
    } catch (error) {
      // Restore on error
      this.addItem(todo);
      throw error;
    }
  }

  // ✨ Modern: Bulk operations
  async toggleMultipleTodos(ids: string[]): Promise<void> {
    const todos = ids.map(id => this.get(id)).filter(Boolean) as Todo[];
    const allCompleted = todos.every(todo => todo.completed);
    const newCompletedState = !allCompleted;

    // Optimistic updates
    ids.forEach(id => {
      this.updateItem(t => t.id === id, { 
        completed: newCompletedState, 
        updatedAt: new Date() 
      });
    });

    try {
      await this.todoService.bulkUpdate(ids, { completed: newCompletedState });
    } catch (error) {
      await this.load();
      throw error;
    }
  }
}
```

---

## 🌐 **Modern HTTP Patterns**

### **1. Signal-Based API Service**

```typescript
// services/api.service.ts - Modern HTTP with signals
import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { rxResource } from '@angular/core/rxjs-interop';
import { BaseHttpService } from '@fourfold/angular-foundation';

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class ModernApiService extends BaseHttpService {
  private readonly http = inject(HttpClient);

  // ✨ Modern: Resource for paginated data
  createPaginatedResource<T>(endpoint: string) {
    const page = signal(1);
    const limit = signal(20);
    const search = signal('');
    
    const resource = rxResource({
      request: () => ({ 
        page: page(), 
        limit: limit(), 
        search: search() 
      }),
      loader: async ({ request }) => {
        const params = new URLSearchParams({
          page: request.page.toString(),
          limit: request.limit.toString(),
          ...(request.search && { search: request.search })
        });
        
        return this.get<{
          data: T[];
          total: number;
          page: number;
          totalPages: number;
        }>(`${endpoint}?${params}`);
      }
    });

    return {
      // State signals
      data: computed(() => resource.value()?.data ?? []),
      total: computed(() => resource.value()?.total ?? 0),
      totalPages: computed(() => resource.value()?.totalPages ?? 0),
      currentPage: page.asReadonly(),
      loading: resource.isLoading,
      error: resource.error,
      
      // Actions
      setPage: (newPage: number) => page.set(newPage),
      setLimit: (newLimit: number) => limit.set(newLimit),
      setSearch: (newSearch: string) => search.set(newSearch),
      reload: () => resource.reload()
    };
  }

  // ✨ Modern: Resource for single item
  createItemResource<T>(endpoint: string, id: signal<string | null>) {
    const resource = rxResource({
      request: () => id(),
      loader: ({ request: itemId }) => {
        if (!itemId) return Promise.resolve(null);
        return this.get<T>(`${endpoint}/${itemId}`);
      }
    });

    return {
      data: computed(() => resource.value()),
      loading: resource.isLoading,
      error: resource.error,
      reload: () => resource.reload()
    };
  }

  // ✨ Modern: Mutation with optimistic updates
  createMutation<TInput, TOutput>(
    mutationFn: (input: TInput) => Promise<TOutput>,
    options?: {
      onSuccess?: (data: TOutput, input: TInput) => void;
      onError?: (error: Error, input: TInput) => void;
    }
  ) {
    const loading = signal(false);
    const error = signal<Error | null>(null);
    const data = signal<TOutput | null>(null);

    const mutate = async (input: TInput): Promise<TOutput> => {
      loading.set(true);
      error.set(null);

      try {
        const result = await mutationFn(input);
        data.set(result);
        options?.onSuccess?.(result, input);
        return result;
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error('Mutation failed');
        error.set(errorObj);
        options?.onError?.(errorObj, input);
        throw errorObj;
      } finally {
        loading.set(false);
      }
    };

    return {
      mutate,
      loading: loading.asReadonly(),
      error: error.asReadonly(),
      data: data.asReadonly(),
      reset: () => {
        loading.set(false);
        error.set(null);
        data.set(null);
      }
    };
  }
}

// ✨ Modern: Typed API service
@Injectable({ providedIn: 'root' })
export class TodoApiService {
  private readonly api = inject(ModernApiService);

  // ✨ Modern: Paginated todos resource
  createTodosResource() {
    return this.api.createPaginatedResource<Todo>('/api/todos');
  }

  // ✨ Modern: Single todo resource
  createTodoResource(id: signal<string | null>) {
    return this.api.createItemResource<Todo>('/api/todos', id);
  }

  // ✨ Modern: Create todo mutation
  createCreateTodoMutation() {
    return this.api.createMutation(
      (todoData: Omit<Todo, 'id' | 'createdAt' | 'updatedAt'>) =>
        this.api.post<Todo>('/api/todos', todoData),
      {
        onSuccess: (newTodo) => {
          console.log('Todo created:', newTodo);
        },
        onError: (error) => {
          console.error('Failed to create todo:', error);
        }
      }
    );
  }

  // ✨ Modern: Update todo mutation
  createUpdateTodoMutation() {
    return this.api.createMutation(
      ({ id, updates }: { id: string; updates: Partial<Todo> }) =>
        this.api.patch<Todo>(`/api/todos/${id}`, updates)
    );
  }

  // ✨ Modern: Delete todo mutation
  createDeleteTodoMutation() {
    return this.api.createMutation(
      (id: string) => this.api.delete<void>(`/api/todos/${id}`)
    );
  }
}
```

---

## 🎨 **Signal-Driven Components**

### **1. Modern Component with Input Signals**

```typescript
// components/todo-list.component.ts - Latest Angular patterns
import { Component, input, output, effect, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { TodoStore } from '../stores/todo.store';
import { TodoApiService } from '../services/todo-api.service';

@Component({
  selector: 'app-todo-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <!-- ✨ Modern: No OnPush needed with signals -->
    <div class="todo-list">
      <!-- Filters Section -->
      <div class="filters">
        <input 
          [formControl]="searchControl"
          placeholder="Search todos..."
          class="search-input"
        />
        
        <select [formControl]="priorityControl">
          <option value="">All Priorities</option>
          @for (priority of todoStore.availablePriorities(); track priority) {
            <option [value]="priority">{{ priority | titlecase }}</option>
          }
        </select>
        
        <select [formControl]="tagControl">
          <option value="">All Tags</option>
          @for (tag of todoStore.availableTags(); track tag) {
            <option [value]="tag">{{ tag }}</option>
          }
        </select>
        
        <label class="checkbox">
          <input 
            type="checkbox" 
            [formControl]="showCompletedControl"
          />
          Show Completed
        </label>
        
        <button (click)="todoStore.clearFilters()">Clear Filters</button>
      </div>

      <!-- Statistics -->
      <div class="stats" [class.loading]="todoStore.loading()">
        <div class="stat">
          <span class="label">Total:</span>
          <span class="value">{{ todoStore.todoStats().total }}</span>
        </div>
        <div class="stat">
          <span class="label">Completed:</span>
          <span class="value">{{ todoStore.todoStats().completed }}</span>
        </div>
        <div class="stat">
          <span class="label">Pending:</span>
          <span class="value">{{ todoStore.todoStats().pending }}</span>
        </div>
        <div class="stat">
          <span class="label">Filtered:</span>
          <span class="value">{{ todoStore.todoStats().filtered }}</span>
        </div>
      </div>

      <!-- Loading State -->
      @if (todoStore.loading()) {
        <div class="loading-spinner">Loading todos...</div>
      }

      <!-- Error State -->
      @if (todoStore.error()) {
        <div class="error-message">
          <p>{{ todoStore.error() }}</p>
          <button (click)="todoStore.load()">Retry</button>
        </div>
      }

      <!-- Todo Items -->
      @if (todoStore.hasData()) {
        <div class="todo-grid">
          @for (todo of todoStore.filteredTodos(); track todo.id) {
            <div 
              class="todo-item" 
              [class.completed]="todo.completed"
              [class.high-priority]="todo.priority === 'high'"
            >
              <!-- Checkbox -->
              <input 
                type="checkbox"
                [checked]="todo.completed"
                (change)="toggleTodo(todo.id)"
                class="todo-checkbox"
              />
              
              <!-- Content -->
              <div class="todo-content">
                <div class="todo-text">{{ todo.text }}</div>
                
                <div class="todo-meta">
                  <span class="priority priority-{{ todo.priority }}">
                    {{ todo.priority }}
                  </span>
                  
                  @if (todo.tags.length > 0) {
                    <div class="tags">
                      @for (tag of todo.tags; track tag) {
                        <span class="tag">{{ tag }}</span>
                      }
                    </div>
                  }
                  
                  <span class="date">{{ todo.createdAt | date:'short' }}</span>
                </div>
              </div>
              
              <!-- Actions -->
              <div class="todo-actions">
                <button (click)="editTodo(todo)" class="btn-edit">Edit</button>
                <button (click)="deleteTodo(todo.id)" class="btn-delete">Delete</button>
              </div>
            </div>
          }
        </div>
      }

      <!-- Empty State -->
      @if (todoStore.isEmpty()) {
        <div class="empty-state">
          <h3>No todos yet</h3>
          <p>Create your first todo to get started!</p>
          <button (click)="createFirstTodo()" class="btn-primary">
            Add Todo
          </button>
        </div>
      }

      <!-- Bulk Actions -->
      @if (selectedTodos().length > 0) {
        <div class="bulk-actions">
          <span>{{ selectedTodos().length }} selected</span>
          <button (click)="toggleSelectedTodos()">Toggle Completed</button>
          <button (click)="deleteSelectedTodos()">Delete Selected</button>
          <button (click)="clearSelection()">Clear Selection</button>
        </div>
      }
    </div>
  `,
  styleUrls: ['./todo-list.component.scss']
})
export class TodoListComponent {
  // ✨ Modern: Input signals (no @Input decorator)
  readonly showBulkActions = input<boolean>(false);
  readonly defaultPriority = input<Todo['priority']>('medium');
  
  // ✨ Modern: Output signals (no @Output decorator)
  readonly todoSelected = output<Todo>();
  readonly todosChanged = output<Todo[]>();

  // ✨ Modern: Inject services
  protected readonly todoStore = inject(TodoStore);
  private readonly todoApi = inject(TodoApiService);

  // ✨ Modern: Form controls (reactive forms)
  protected readonly searchControl = new FormControl('');
  protected readonly priorityControl = new FormControl('');
  protected readonly tagControl = new FormControl('');
  protected readonly showCompletedControl = new FormControl(true);

  // ✨ Modern: Local component state with signals
  private readonly _selectedTodoIds = signal<Set<string>>(new Set());
  
  // ✨ Modern: Computed from local state
  protected readonly selectedTodos = computed(() => {
    const selectedIds = this._selectedTodoIds();
    return todoStore.data().filter(todo => selectedIds.has(todo.id));
  });

  constructor() {
    // ✨ Modern: Effect for form control reactivity
    effect(() => {
      this.searchControl.valueChanges.pipe(
        debounceTime(300),
        distinctUntilChanged()
      ).subscribe(term => this.todoStore.setSearchTerm(term || ''));
    });

    effect(() => {
      this.priorityControl.valueChanges.subscribe(priority => 
        this.todoStore.setPriorityFilter(priority || null)
      );
    });

    effect(() => {
      this.tagControl.valueChanges.subscribe(tag => 
        this.todoStore.setTagFilter(tag || null)
      );
    });

    effect(() => {
      this.showCompletedControl.valueChanges.subscribe(show => 
        this.todoStore.setShowCompleted(show ?? true)
      );
    });

    // ✨ Modern: Effect for output emissions
    effect(() => {
      const todos = this.todoStore.data();
      this.todosChanged.emit(todos);
    });

    // ✨ Modern: Load data on init
    effect(() => {
      this.todoStore.loadOnce();
    }, { allowSignalWrites: true });
  }

  // ✨ Modern: Event handlers
  async toggleTodo(id: string): Promise<void> {
    try {
      await this.todoStore.toggleTodo(id);
    } catch (error) {
      console.error('Failed to toggle todo:', error);
    }
  }

  editTodo(todo: Todo): void {
    this.todoSelected.emit(todo);
  }

  async deleteTodo(id: string): Promise<void> {
    if (confirm('Are you sure you want to delete this todo?')) {
      try {
        await this.todoStore.deleteTodo(id);
      } catch (error) {
        console.error('Failed to delete todo:', error);
      }
    }
  }

  createFirstTodo(): void {
    // Navigate to create form or open modal
    console.log('Create first todo');
  }

  // ✨ Modern: Bulk operations
  toggleSelectedTodos(): void {
    const selectedIds = Array.from(this._selectedTodoIds());
    if (selectedIds.length > 0) {
      this.todoStore.toggleMultipleTodos(selectedIds);
    }
  }

  async deleteSelectedTodos(): Promise<void> {
    const selectedIds = Array.from(this._selectedTodoIds());
    if (selectedIds.length > 0 && confirm(`Delete ${selectedIds.length} todos?`)) {
      try {
        await Promise.all(selectedIds.map(id => this.todoStore.deleteTodo(id)));
        this.clearSelection();
      } catch (error) {
        console.error('Failed to delete todos:', error);
      }
    }
  }

  clearSelection(): void {
    this._selectedTodoIds.set(new Set());
  }

  toggleTodoSelection(todoId: string): void {
    this._selectedTodoIds.update(currentIds => {
      const newIds = new Set(currentIds);
      if (newIds.has(todoId)) {
        newIds.delete(todoId);
      } else {
        newIds.add(todoId);
      }
      return newIds;
    });
  }
}
```

### **2. Modern Form Component**

```typescript
// components/todo-form.component.ts - Signal-based forms
import { Component, input, output, effect, signal, computed, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-todo-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <form [formGroup]="todoForm" (ngSubmit)="handleSubmit()" class="todo-form">
      <h3>{{ isEditing() ? 'Edit Todo' : 'Create Todo' }}</h3>
      
      <!-- Text Input -->
      <div class="form-field">
        <label for="text">Todo Text *</label>
        <input 
          id="text"
          type="text" 
          formControlName="text"
          placeholder="What needs to be done?"
          [class.error]="hasFieldError('text')"
        />
        @if (hasFieldError('text')) {
          <div class="error-message">
            {{ getFieldError('text') }}
          </div>
        }
      </div>

      <!-- Priority Select -->
      <div class="form-field">
        <label for="priority">Priority</label>
        <select id="priority" formControlName="priority">
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>

      <!-- Tags Input -->
      <div class="form-field">
        <label for="tags">Tags</label>
        <input 
          id="tags"
          type="text" 
          formControlName="tagsInput"
          placeholder="Enter tags separated by commas"
          (blur)="updateTagsFromInput()"
        />
        
        @if (currentTags().length > 0) {
          <div class="tags-display">
            @for (tag of currentTags(); track tag) {
              <span class="tag">
                {{ tag }}
                <button 
                  type="button" 
                  (click)="removeTag(tag)"
                  class="tag-remove"
                >×</button>
              </span>
            }
          </div>
        }
      </div>

      <!-- Form Actions -->
      <div class="form-actions">
        <button 
          type="submit" 
          [disabled]="!isFormValid() || isSubmitting()"
          class="btn-primary"
        >
          @if (isSubmitting()) {
            <span class="spinner"></span>
          }
          {{ isEditing() ? 'Update' : 'Create' }} Todo
        </button>
        
        <button 
          type="button" 
          (click)="handleCancel()"
          class="btn-secondary"
        >
          Cancel
        </button>
        
        @if (isEditing()) {
          <button 
            type="button" 
            (click)="handleReset()"
            class="btn-outline"
          >
            Reset
          </button>
        }
      </div>

      <!-- Form State Debug (dev only) -->
      @if (!isProduction) {
        <div class="debug-info">
          <details>
            <summary>Form Debug</summary>
            <pre>{{ formDebugInfo() | json }}</pre>
          </details>
        </div>
      }
    </form>
  `,
  styleUrls: ['./todo-form.component.scss']
})
export class TodoFormComponent {
  private readonly fb = inject(FormBuilder);

  // ✨ Modern: Input signals
  readonly todo = input<Todo | null>(null);
  readonly isLoading = input<boolean>(false);
  
  // ✨ Modern: Output signals
  readonly todoSubmitted = output<Omit<Todo, 'id' | 'createdAt' | 'updatedAt'>>();
  readonly cancelled = output<void>();
  readonly resetRequested = output<void>();

  // ✨ Modern: Local state signals
  private readonly _isSubmitting = signal(false);
  private readonly _currentTags = signal<string[]>([]);

  // ✨ Modern: Computed state
  readonly isEditing = computed(() => !!this.todo());
  readonly isSubmitting = this._isSubmitting.asReadonly();
  readonly currentTags = this._currentTags.asReadonly();
  readonly isFormValid = computed(() => this.todoForm.valid);

  // Form setup
  protected readonly todoForm: FormGroup;
  protected readonly isProduction = !globalThis['ng']?.coreTokens; // Simple prod check

  constructor() {
    // ✨ Modern: Form setup
    this.todoForm = this.fb.group({
      text: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(500)]],
      priority: ['medium', [Validators.required]],
      tagsInput: ['']
    });

    // ✨ Modern: Effect for todo changes
    effect(() => {
      const todo = this.todo();
      if (todo) {
        this.todoForm.patchValue({
          text: todo.text,
          priority: todo.priority,
          tagsInput: todo.tags.join(', ')
        });
        this._currentTags.set([...todo.tags]);
      } else {
        this.resetForm();
      }
    });

    // ✨ Modern: Effect for loading state
    effect(() => {
      const loading = this.isLoading();
      if (loading) {
        this.todoForm.disable();
      } else {
        this.todoForm.enable();
      }
    });
  }

  // ✨ Modern: Computed debug info
  protected readonly formDebugInfo = computed(() => ({
    valid: this.todoForm.valid,
    dirty: this.todoForm.dirty,
    touched: this.todoForm.touched,
    errors: this.getAllFormErrors(),
    values: this.todoForm.value,
    currentTags: this._currentTags()
  }));

  // Form methods
  handleSubmit(): void {
    if (!this.isFormValid() || this._isSubmitting()) return;

    this._isSubmitting.set(true);

    try {
      const formValue = this.todoForm.value;
      this.updateTagsFromInput(); // Ensure tags are current

      const todoData = {
        text: formValue.text.trim(),
        priority: formValue.priority,
        tags: this._currentTags(),
        completed: false
      };

      this.todoSubmitted.emit(todoData);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      this._isSubmitting.set(false);
    }
  }

  handleCancel(): void {
    this.cancelled.emit();
  }

  handleReset(): void {
    this.resetRequested.emit();
  }

  // Tag management
  updateTagsFromInput(): void {
    const tagsInput = this.todoForm.get('tagsInput')?.value || '';
    const tags = tagsInput
      .split(',')
      .map((tag: string) => tag.trim())
      .filter((tag: string) => tag.length > 0)
      .filter((tag: string, index: number, array: string[]) => array.indexOf(tag) === index); // Dedupe

    this._currentTags.set(tags);
  }

  removeTag(tagToRemove: string): void {
    this._currentTags.update(tags => tags.filter(tag => tag !== tagToRemove));
    
    // Update form input
    const remainingTags = this._currentTags().join(', ');
    this.todoForm.patchValue({ tagsInput: remainingTags });
  }

  addTag(newTag: string): void {
    const trimmedTag = newTag.trim();
    if (trimmedTag && !this._currentTags().includes(trimmedTag)) {
      this._currentTags.update(tags => [...tags, trimmedTag]);
      
      // Update form input
      const allTags = this._currentTags().join(', ');
      this.todoForm.patchValue({ tagsInput: allTags });
    }
  }

  // Form validation helpers
  hasFieldError(fieldName: string): boolean {
    const field = this.todoForm.get(fieldName);
    return !!(field?.invalid && (field?.dirty || field?.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.todoForm.get(fieldName);
    if (!field?.errors) return '';

    const errors = field.errors;
    
    if (errors['required']) return `${fieldName} is required`;
    if (errors['minlength']) return `${fieldName} is too short`;
    if (errors['maxlength']) return `${fieldName} is too long`;
    
    return 'Invalid input';
  }

  private getAllFormErrors(): any {
    const errors: any = {};
    Object.keys(this.todoForm.controls).forEach(key => {
      const control = this.todoForm.get(key);
      if (control?.errors) {
        errors[key] = control.errors;
      }
    });
    return errors;
  }

  private resetForm(): void {
    this.todoForm.reset({
      text: '',
      priority: 'medium',
      tagsInput: ''
    });
    this._currentTags.set([]);
    this._isSubmitting.set(false);
  }
}
```

---

This modern implementation guide showcases the latest Angular 18+ patterns with pure signals architecture, eliminating the need for decorators and subscriptions while providing enterprise-grade functionality. Every pattern is designed for maximum type safety, performance, and developer experience.
