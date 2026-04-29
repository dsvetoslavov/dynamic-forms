import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsService, Form } from './forms.service';

@Component({
  selector: 'app-form-list',
  imports: [RouterLink, DatePipe],
  templateUrl: './form-list.html',
})
export class FormListComponent implements OnInit {
  private svc = inject(FormsService);
  forms = signal<Form[]>([]);

  ngOnInit() {
    this.load();
  }

  load() {
    this.svc.list().subscribe((forms) => this.forms.set(forms));
  }

  deleteForm(form: Form) {
    if (confirm(`Delete "${form.name}"?`)) {
      this.svc.delete(form.id).subscribe(() => this.load());
    }
  }
}
