import {AfterViewInit, Component, OnDestroy, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {RouterOutlet} from '@angular/router';
import ZoomVideo, {Participant} from '@zoom/videosdk';
import {FormsModule} from "@angular/forms";
import {ZoomApiServiceService} from "./service/zoom-api-service.service";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {}
