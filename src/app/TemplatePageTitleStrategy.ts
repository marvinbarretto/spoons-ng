import { Injectable } from "@angular/core";
import { Title } from "@angular/platform-browser";
import { RouterStateSnapshot, TitleStrategy } from "@angular/router";

@Injectable({providedIn: 'root'})
export class TemplatePageTitleStrategy extends TitleStrategy {
  constructor(
    private readonly title: Title) {
    super();
  }

  override updateTitle(routerState: RouterStateSnapshot) {
    const customTitle = this.buildTitle(routerState) || '';
    const title = this.buildTitle(routerState);

    // TODO: Get this from a global service
    const companyName = 'SPOONS';

    if (title !== undefined) {
      this.title.setTitle(`${customTitle} - ${companyName}`);
    }
    else {
      this.title.setTitle(`${companyName}`);
    }
  }
}
