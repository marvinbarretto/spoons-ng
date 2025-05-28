import { Component } from '@angular/core';
import { MapComponent as MapLibreMapComponent } from '@maplibre/ngx-maplibre-gl';


@Component({
  selector: 'app-map',
  imports: [MapLibreMapComponent],
  templateUrl: './map.component.html',
  styleUrl: './map.component.scss'
})
export class MapComponent {

}
