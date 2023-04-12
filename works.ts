import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Router, ActivatedRoute, NavigationExtras } from '@angular/router';
import { ApicallsService } from '../../services/apicalls.service';
import { NgbModal, ModalDismissReasons } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { AuthenticationService } from '../../services/authentication.service';
import { CalendarOptions, FullCalendarModule, FullCalendarComponent } from '@fullcalendar/angular'; // useful for typechecking
import { FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';

import * as global from '../../services/global.service';

import Swal from 'sweetalert2';
import esLocale from '@fullcalendar/core/locales/es';
import * as moment from 'moment';

declare const $;
@Component({
    selector: 'app-trabajo-calendar',
    templateUrl: './trabajo-calendar.component.html',
    styleUrls: ['./trabajo-calendar.component.css']
})
export class TrabajoCalendarComponent implements OnInit {
    isSaving: boolean = false;
    isUpdating = false;
    loader: boolean = true; 
    botonTexto: string = 'Guardar cambio';//Texto del botón del modal si decidimos enviar el aviso a alguien
    ausencias_mes: any = [];
    cabinas: any = [];
    trabajo_selected_modify:any;
    cliente_selected_modify:any;
    artista_selected_modify:any;
    cabinasParaFullCalendar: any = [];
    formTrabajo!: FormGroup;
    cliente_selected_id:any;
    clientes:any;
    formCliente!: FormGroup;
    trabajos: any;
    artistas: any;
    edad_cliente:any;
    estudio: any;
    roleinfo:any;
    idColegio: any;
    calendar_load:any = false;
    calendarOptions: CalendarOptions = {};
    trabajosFilter: any;
    artistas_residentes: any;
    idTrabajo: any;
    artistas_invitados: any;
    dropdownSettingsCliente = {};
    selectedArtista: any = '';
    selectedTipoTrabajo: any = '';
    trabajos_dia_select: any;
    dia_select: any;
    hora_select_start: any;
    hora_select_end: any;
    cabina_select:any;
    value_change: any = {};
    cliente_selected:any;
    value_info: any;
    nuevoCliente: any;
    eventos= [] as any;
    deleteTrabajo: any;
    idMember : any;
    selectedTrabajo: any;
    allWorks: any = 0;
    aviso_artista = false;
    aviso_cliente = false;
    aviso_estudio = false;
    selectedTrabajoCopy: any;
    editable = false;
    page = 1;
    pageSize = 10;
    collectionSize = 0;
    _searchTerm = '';
    global_url: any;
    public imagePath: string | null = null;
    imgURL: string | null = null;
    public message = '';
    user: any;
    tieneSenal: boolean = false;

    //AÑADIDO
    showWarning: boolean = false;
    fechas_ausentes: any = [];

    @ViewChild('modalDayButton') modalDayButton: ElementRef<HTMLElement>;
    @ViewChild('modalNewEventButton') modalNewEventButton: ElementRef<HTMLElement>;
    @ViewChild('modalEditEventButton') modalEditEventButton: ElementRef<HTMLElement>;
    @ViewChild('calendar') calendarComponent: FullCalendarComponent;

    constructor(
      private router: Router,
      private toastr: ToastrService,
      private formBuilder: FormBuilder,
      private api: ApicallsService,
      private auth: AuthenticationService,
      private modalService: NgbModal,
      private currentroute: ActivatedRoute
    ) {}

    ngOnInit() {
        this.user = this.auth.currentUserValue;
        this.estudio = this.user.estudio;
        if(this.user.rol_id == 3 || this.user.rol_id == 4){
          this.api.getRoleInfo(this.user.id).subscribe((data: any) => {
            this.roleinfo = data.success.user;
            this.idMember = data.success.user.id;
            
          });
        }else{
          this.getArtistas();
          this.getCabinas();
        }
        this.getArtistas();
        this.getCabinas();
        this.getTrabajos();
        this.global_url = global.API_URL;

        this.formTrabajo = this.formBuilder.group({
          cliente_id: [''],
          estudio_id: ['', Validators.required ],
          cabina_id: [''],

          
          comision_artista: [''],
          precio: [''],
          has_senal: [''],
          senal: [''],
          forma_pagosenal: [''],
          fecha_pagosenal: [''],
          recoge_pagosenal: ['1'],


          tipo_proyecto: ['', Validators.required],
          fase_cita: [''],
          artista_id: ['', Validators.required],
          fecha: ['', Validators.required],
          horai: ['', Validators.required],
          horaf: ['', Validators.required],
          descripcion: [''],
        });
        this.formCliente = this.formBuilder.group({
          estudio_id: ['', Validators.required],
          nombre: ['', Validators.required ],
          apellido1: [''],
        });
        this.formTrabajo.patchValue({'estudio_id': this.user.estudio_id});
        this.formCliente.patchValue({'estudio_id': this.user.estudio_id});

        this.dropdownSettingsCliente = {
          singleSelection: true,
          idField: 'id',
          textField: 'nombre_completo',
          selectAllText: 'Seleccionar todos',
          unSelectAllText: 'Deseleccionar todos',
          itemsShowLimit: 6,
          enableCheckAll: false,
          allowSearchFilter: true,
          noDataAvailablePlaceholderText: 'No hay datos para mostrar',
          searchPlaceholderText: 'Buscar'
        };
    }

    //Modificando el texto del botón del modal si decidimos enviar el aviso a alguien
    siQueremosAvisar(): void {
      if (this.aviso_artista || this.aviso_cliente || this.aviso_estudio) {
        this.botonTexto = 'Guardar y avisar del cambio';
      } else {
        this.botonTexto = 'Guardar cambio';
      }
    }
    setTieneSenal(){
      this.tieneSenal = !this.tieneSenal;
      if(this.tieneSenal){
        setTimeout(()=>{                          
          $( '#fecha_pagosenal' ).datepicker(
            {
              onSelect: function( _this, dateText ) 
              {
                var fecha = dateText.selectedYear +'-'+( dateText.selectedMonth + 1 ) +'-'+ dateText.selectedDay;
                this.formTrabajo.patchValue({'fecha_pagosenal': fecha});
              }.bind( this )
            }
          );
          }, 1000);
        }
      }
    
    //Original
    //changeArtista(id){
    //  var artista = this.artistas.find((x: any) => x.id == id);
    //  this.formTrabajo.patchValue({'comision_artista': artista.porcentaje_comision});
    //}

    //Función para mostrar una aviso si el artista está ausente la fecha seleccionada
    changeArtista(id) {
      const artista = this.artistas.find((x: any) => x.id == id);
    
      this.fechas_ausentes = [];
      if (artista) {
        artista.ausencias.forEach((element: any) => {
          this.fechas_ausentes.push(moment(element.fecha).format('YYYY-MM-DD'));
        });
      }
    
      const fechaSeleccionada = moment(this.dia_select).format('YYYY-MM-DD');
      this.showWarning = this.fechas_ausentes.includes(fechaSeleccionada);

      this.formTrabajo.patchValue({'comision_artista': artista.porcentaje_comision});
    }
    

    get searchTerm(): string {
      return this._searchTerm;
    }
    set searchTerm(val: string) {
        this._searchTerm = val;
        this.trabajosFilter = this.filter(val);
        this.page = 1;
    }
    filter(v: string) {
        return this.trabajos.filter((x: { nombre: string; }) => x.nombre.toLowerCase().indexOf(v.toLowerCase()) !== -1);
    }
    editElement(Trabajo: any) {
        this.router.navigate(['/trabajos/edit/'+Trabajo.id]);
    }
    changePageSize(items: any){
      this.pageSize = items;
    }
    addTrabajo() {
     window.open(
        '/trabajos/new?fecha='+this.dia_select,
        '_blank'
      );
    }
    //eventoClick(arg: any) {
        //this.router.navigate(['/trabajos/view/'+arg.event._def.publicId]);
    //}
    
    //Se aplican condicionales para abrir las fichas de trabajo en la misma pestaño u otra.
    eventoClick(arg: any) {
      // Comprueba si el estudio actual tiene la ID370 o 242
      if (this.user.estudio_id === 370 || this.user.estudio_id === 242) {
        // Abre el trabajo en una nueva pestaña
        this.router.navigate([]).then((result) => {
          window.open('/trabajos/view/' + arg.event._def.publicId, '_blank');
        });
      } else {
        // Abre el trabajo en la misma pestaña
        this.router.navigate(['/trabajos/view/', arg.event._def.publicId]);
      }
    }
    


    parseHora(hora){
      hora = moment(hora,'HH:mm:ss').format('HH:mm');
      return hora;
    }
    dayClick(event) {
      // if(!event.dayEl.className.includes("past")){
        this.dia_select = moment(event.dateStr).format('YYYY-MM-DD');
        this.trabajos_dia_select = this.trabajos.filter((x: any) => x.fecha == this.dia_select);
        let el: HTMLElement = this.modalDayButton.nativeElement;
        el.click();
      // }
    }
    selectRange(selectRange){
      this.dia_select = null;
      this.hora_select_start = null;
      this.hora_select_end = null;
      this.cabina_select = null;
      if(selectRange.allDay){
        this.dia_select = moment(selectRange.startStr).format('YYYY-MM-DD');
        this.formTrabajo.patchValue({'fecha': this.dia_select});
      }else{
        this.dia_select = moment(selectRange.startStr).format('YYYY-MM-DD');
        this.formTrabajo.patchValue({'fecha': this.dia_select});
        this.hora_select_start = moment(selectRange.startStr).format('HH:mm');
        this.hora_select_end = moment(selectRange.endStr).format('HH:mm');
        this.formTrabajo.patchValue({'horai': this.hora_select_start});
        this.formTrabajo.patchValue({'horaf': this.hora_select_end});
      }
      if(selectRange.resource){
        this.cabina_select = selectRange.resource._resource;
        this.formTrabajo.patchValue({'cabina_id': this.cabina_select.id});
       
      }
      let el: HTMLElement = this.modalNewEventButton.nativeElement;
      el.click();
    }

    eventChange(info){
      this.aviso_artista = false;
      this.aviso_cliente = false;
      this.aviso_estudio = false;
      this.value_info = info;
      this.value_change = {};
      this.value_change.id = info.event.id;
      this.value_change.new_date = moment(info.event.start.toISOString()).format('YYYY-MM-DD');
      this.value_change.new_horai = moment(info.event.start.toISOString()).format('HH:mm');
      this.value_change.new_horaf = moment(info.event.end.toISOString()).format('HH:mm');
      if(info.newResource){
        this.value_change.new_resource = info.newResource._resource.id;
      }else{
        this.value_change.new_resource = null;
      }
      this.trabajo_selected_modify = this.trabajos.find((x: any) => x.id == info.event.id);
      this.cliente_selected_modify = this.clientes.find((x: any) => x.id == this.trabajo_selected_modify.cliente_id);
      this.artista_selected_modify = this.artistas.find((x: any) => x.id == this.trabajo_selected_modify.artista_id);
      let elModify: HTMLElement = this.modalEditEventButton.nativeElement;
      elModify.click();
    }
    traerClientes(){
      this.api.getClientesEstudioNew(this.user.estudio_id).subscribe( ( data: any ) => {
        this.clientes = data.response;
        //Lo de abajo hace que no se muestren menores sin tutor
        //this.clientes = this.clientes.filter((x: any) => this.isMenor(x) == false || x.tutor);
        this.clientes.forEach(element => {
          var apellido_uno = element.apellido1;
          var apellido_dos = element.apellido2;
          if( element.apellido1 && apellido_uno && apellido_dos ){
            element.nombre_completo = element.nombre + ' ' + element.apellido1 + ' ' + element.apellido2;
          }else if( element.apellido1 && apellido_uno && !apellido_dos ){
            element.nombre_completo = element.nombre + ' ' + element.apellido1;
          }else {
            element.nombre_completo = element.nombre;
          }
          
        });
        this.calendar_load = true;
        this.loader = false;
    });
      
    }
    setNuevoCliente(){
      this.nuevoCliente = !this.nuevoCliente;
    }
    setAvisoArtista(){
      this.aviso_artista = !this.aviso_artista;
    }
    setAvisoCliente(){
      this.aviso_cliente = !this.aviso_cliente;
    }
    setAvisoEstudio(){
      this.aviso_estudio = !this.aviso_estudio;
    }
    cierroSelectorCliente(){ 
      if(this.cliente_selected_id && this.cliente_selected_id.length > 0){
        this.cliente_selected = this.clientes.find((x: any) => x.id == this.cliente_selected_id[0].id);
        this.formTrabajo.patchValue({'cliente_id': this.cliente_selected_id[0].id});
        
        //Calculando la edad del cliente seleccionado
        var years = moment().diff(this.cliente_selected.fecha_nacimiento, 'years');
        this.edad_cliente = years;
  
       // console.log(this.cliente_selected);
      }else{
        this.cliente_selected = null;
      }
    }
    getTrabajos(){
      this.eventos = [];
      
      
      if(this.user.rol_id != 1){
        this.api.getTrabajosEstudioNew(this.user.estudio_id, this.allWorks).subscribe( ( data: any ) => {
          this.trabajos = data.response;   
          
          if(this.user.rol_id == 4 && this.roleinfo?.ver_citas != 1){
            this.trabajos = this.trabajos.filter((x: any) => x.artista_id == this.idMember);
          }
          if(this.selectedArtista && !this.selectedTipoTrabajo){
            // console.log(1);
            this.trabajos = this.trabajos.filter((x: any) => x.artista_id == this.selectedArtista);
          } else if(this.selectedTipoTrabajo && !this.selectedArtista){
            // console.log(2);
            this.trabajos = this.trabajos.filter((x: any) => x.tipo_proyecto == this.selectedTipoTrabajo);
          }else if(this.selectedArtista && this.selectedTipoTrabajo){
            // console.log(3);
            this.trabajos = this.trabajos.filter((x: any) => x.tipo_proyecto == this.selectedTipoTrabajo && x.artista_id == this.selectedArtista);
          }
          this.trabajos.forEach((element:any) => {
            if(element.cliente_deleted == 0 && element.artista_deleted == 0 && element.artista_visible == 1 && element.cancelada == 0 && (element.tipo_proyecto == 1 && element.fase_cita == 1 )){
              var cabina_id = 0;
              if(element.cabina_id) {
                cabina_id = element?.cabina_id;
              }
              var item_pr = {
                'className': 'proyecto',
                'resourceId': cabina_id,
                'id': element.id,
                'title': element.cliente_nombre + " - " + element.artista_nombre + ' ' + element.artista_apellido,
                'start': element.fecha+'T'+element.horai,
                'end': element.fecha+'T'+element.horaf,
                color: element.artista_color,
                backgroundColor: element.artista_color,
                'extendedProps': {
                  'descripcion': element.descripcion // descripcion del trabajo
                },
              }
              this.eventos.push(item_pr);
            }
            if(element.cliente_deleted == 0 && element.artista_deleted == 0 && element.artista_visible == 1 && element.cancelada == 0 && (element.tipo_proyecto == 1 && element.fase_cita == 2 )){
              var cabina_id = 0;
              if(element.cabina_id) {
                cabina_id = element?.cabina_id;
              }
              var item_b = {
                'className': 'boceto',
                'resourceId': cabina_id,
                'id': element.id,
                'title': element.cliente_nombre + " - " + element.artista_nombre + ' ' + element.artista_apellido,
                'start': element.fecha+'T'+element.horai,
                'end': element.fecha+'T'+element.horaf,
                color: element.artista_color,
                backgroundColor: element.artista_color,
                'extendedProps': {
                  'descripcion': element.descripcion // descripcion del trabajo
                },
              }
              this.eventos.push(item_b);
            }
            /*Tattoo sin señal*/
            if(element.cliente_deleted == 0 && element.artista_deleted == 0 && element.artista_visible == 1 && element.cancelada == 0 && !element.senal && (element.tipo_proyecto == 1 && element.fase_cita == 3 )){
              var cabina_id = 0;
              if(element.cabina_id) {
                cabina_id = element?.cabina_id;
              }
              var item_t = {
                'className': 'tattoo',
                'resourceId': cabina_id,
                'id': element.id,
                'title': element.cliente_nombre + " - " + element.artista_nombre + ' ' + element.artista_apellido,
                'start': element.fecha+'T'+element.horai,
                'end': element.fecha+'T'+element.horaf,
                color: element.artista_color,
                backgroundColor: element.artista_color,
                'extendedProps': {
                  'descripcion': element.descripcion // descripcion del trabajo
                },
              }
              this.eventos.push(item_t);
            }
            /*Tattoo con señal*/
            if(element.cliente_deleted == 0 && element.artista_deleted == 0 && element.artista_visible == 1 && element.cancelada == 0 && element.senal >= 1 && (element.tipo_proyecto == 1 && element.fase_cita == 3 )){
              var cabina_id = 0;
              if(element.cabina_id) {
                cabina_id = element?.cabina_id;
              }
              var item_ts = {
                'className': 'tattoosenal',
                'resourceId': cabina_id,
                'id': element.id,
                'title': element.cliente_nombre + " - " + element.artista_nombre + ' ' + element.artista_apellido,
                'start': element.fecha+'T'+element.horai,
                'end': element.fecha+'T'+element.horaf,
                color: element.artista_color,
                backgroundColor: element.artista_color,
                'extendedProps': {
                  'descripcion': element.descripcion // descripcion del trabajo
                },
              }
              this.eventos.push(item_ts);
            }
            if(element.cliente_deleted == 0 && element.artista_deleted == 0 && element.artista_visible == 1 && element.cancelada == 0 && (element.tipo_proyecto == 1 && element.fase_cita == 4 )){
              var cabina_id = 0;
              if(element.cabina_id) {
                cabina_id = element?.cabina_id;
              }
              var item_r = {
                'className': 'repaso',
                'resourceId': cabina_id,
                'id': element.id,
                'title': element.cliente_nombre + " - " + element.artista_nombre + ' ' + element.artista_apellido,
                'start': element.fecha+'T'+element.horai,
                'end': element.fecha+'T'+element.horaf,
                color: element.artista_color,
                backgroundColor: element.artista_color,
                'extendedProps': {
                  'descripcion': element.descripcion // descripcion del trabajo
                },
              }
              this.eventos.push(item_r);
            }
            if(element.cliente_deleted == 0 && element.artista_deleted == 0 && element.artista_visible == 1 && element.cancelada == 0 && element.tipo_proyecto == 2){
              var cabina_id = 0;
              if(element.cabina_id) {
                cabina_id = element?.cabina_id;
              }
              var item_w = {
                'className': 'walk-in',
                'resourceId': cabina_id,
                'id': element.id,
                'title': element.cliente_nombre + " - " + element.artista_nombre + ' ' + element.artista_apellido,
                'start': element.fecha+'T'+element.horai,
                'end': element.fecha+'T'+element.horaf,
                color: element.artista_color,
                backgroundColor: element.artista_color,
                'extendedProps': {
                  'descripcion': element.descripcion // descripcion del trabajo
                },
              }
              this.eventos.push(item_w);
            }
            if(element.cliente_deleted == 0 && element.artista_deleted == 0 && element.artista_visible == 1 && element.cancelada == 0 && element.tipo_proyecto == 3){
              var cabina_id = 0;
              if(element.cabina_id) {
                cabina_id = element?.cabina_id;
              }
              var item_p = {
                'className': 'piercing',
                'resourceId': cabina_id,
                'id': element.id,
                'title': element.cliente_nombre + " - " + element.artista_nombre + ' ' + element.artista_apellido,
                'start': element.fecha+'T'+element.horai,
                'end': element.fecha+'T'+element.horaf,
                color: element.artista_color,
                backgroundColor: element.artista_color,
                'extendedProps': {
                  'descripcion': element.descripcion // descripcion del trabajo
                },
              }
              this.eventos.push(item_p);
            }
            if(element.cliente_deleted == 0 && element.artista_deleted == 0 && element.artista_visible == 1 && element.cancelada == 0 && element.tipo_proyecto == 4){
              var cabina_id = 0;
              if(element.cabina_id) {
                cabina_id = element?.cabina_id;
              }
              var item_l = {
                'className': 'laser',
                'resourceId': cabina_id,
                'id': element.id,
                'title': element.cliente_nombre + " - " + element.artista_nombre + ' ' + element.artista_apellido,
                'start': element.fecha+'T'+element.horai,
                'end': element.fecha+'T'+element.horaf,
                color: element.artista_color,
                backgroundColor: element.artista_color,
                'extendedProps': {
                  'descripcion': element.descripcion // descripcion del trabajo
                },
              }
              this.eventos.push(item_l);
            }
            if(element.cliente_deleted == 0 && element.artista_deleted == 0 && element.artista_visible == 1 && element.cancelada == 0 && element.tipo_proyecto == 5){
              var cabina_id = 0;
              if(element.cabina_id) {
                cabina_id = element?.cabina_id;
              }
              var item_m = {
                'className': 'micro',
                'resourceId': cabina_id,
                'id': element.id,
                'title': element.cliente_nombre + " - " + element.artista_nombre + ' ' + element.artista_apellido,
                'start': element.fecha+'T'+element.horai,
                'end': element.fecha+'T'+element.horaf,
                color: element.artista_color,
                backgroundColor: element.artista_color,
                'extendedProps': {
                  'descripcion': element.descripcion // descripcion del trabajo
                },
              }
              this.eventos.push(item_m);
            }
            if(element.cliente_deleted == 0 && element.artista_deleted == 0 && element.artista_visible == 1 && element.cancelada == 0 && element.tipo_proyecto == 6){
              var cabina_id = 0;
              if(element.cabina_id) {
                cabina_id = element?.cabina_id;
              }
              var item_mani = {
                'className': 'manicura',
                'resourceId': cabina_id,
                'id': element.id,
                'title': element.cliente_nombre + " - " + element.artista_nombre + ' ' + element.artista_apellido,
                'start': element.fecha+'T'+element.horai,
                'end': element.fecha+'T'+element.horaf,
                color: element.artista_color,
                backgroundColor: element.artista_color,
                'extendedProps': {
                  'descripcion': element.descripcion // descripcion del trabajo
                },
              }
              this.eventos.push(item_mani);
            }
            if(element.cancelada == 1 && element.ausencia == 0){
              var cabina_id = 0;
              if(element.cabina_id) {
                cabina_id = element?.cabina_id;
              }
              var item2 = {
                'className': 'cancelada',
                'resourceId': cabina_id,
                'id': element.id,
                'title': element.cliente_nombre + ' | ' + element.artista_nombre + ' ' + element.artista_apellido,
                'start': element.fecha+'T'+element.horai,
                'end': element.fecha+'T'+element.horaf,
                color: element.artista_color,
                'extendedProps': {
                  'descripcion': element.descripcion // descripcion del trabajo
                },
              }
              this.eventos.push(item2);
            }
            if(element.cancelada == 1 && element.ausencia == 1){
              var cabina_id = 0;
              if(element.cabina_id) {
                cabina_id = element?.cabina_id;
              }
              var item2 = {
                'className': 'ausente',
                'resourceId': cabina_id,
                'id': element.id,
                'title': element.cliente_nombre + ' | ' + element.artista_nombre + ' ' + element.artista_apellido,
                'start': element.fecha+'T'+element.horai,
                'end': element.fecha+'T'+element.horaf,
                color: element.artista_color,
                'extendedProps': {
                  'descripcion': element.descripcion // descripcion del trabajo
                },
              }
              this.eventos.push(item2);
            }
          });  

          this.calendarOptions = {
            eventDidMount: (args) => {
              const descripcion = args.event.extendedProps.descripcion || '';
              const eventTitle = args.el.querySelector('.fc-event-title');
              const eventDescripcion = document.createElement('span');
              eventDescripcion.className = 'event-descripcion';
              eventDescripcion.textContent = `${descripcion}`;
          
              if (eventTitle) {
                eventTitle.parentNode.insertBefore(eventDescripcion, eventTitle.nextSibling);
              }
            },
            headerToolbar: {
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,resourceTimeGridDay,listWeek'
            },
            selectable: true,
            editable: true,
            initialView: 'dayGridMonth',
            resourceOrder: 'title', 
            resources: this.cabinasParaFullCalendar,
            locale: esLocale,
            nowIndicator: true,
            contentHeight: 600,
            businessHours: {
              daysOfWeek: [ 0, 1, 2, 3, 4, 5, 6 ],
              startTime: '09:00',
              endTime: '21:00',
            },
            scrollTime: '10:00:00',
            displayEventTime: true,
            eventClick: this.eventoClick.bind(this),
            select: this.selectRange.bind(this),
            eventResize: this.eventChange.bind(this),
            eventDrop: this.eventChange.bind(this),
            // dateClick: this.dayClick.bind(this),
            displayEventEnd: true,
            datesSet: this.handleDates.bind(this),
            events: this.eventos
          };
          
          this.traerClientes();
        });
      }else{
        this.api.getTrabajos().subscribe( ( data: any ) => {
          this.trabajos = data.response;      
          if(this.selectedArtista && !this.selectedTipoTrabajo){
            this.trabajos = this.trabajos.filter((x: any) => x.artista_id == this.selectedArtista);
          } else if(this.selectedTipoTrabajo && !this.selectedArtista){
            this.trabajos = this.trabajos.filter((x: any) => x.tipo_proyecto == this.selectedTipoTrabajo);
          }else if(this.selectedArtista && this.selectedTipoTrabajo){
            this.trabajos = this.trabajos.filter((x: any) => x.tipo_proyecto == this.selectedTipoTrabajo && !x.artista_id == this.selectedArtista);
          }
          
          this.trabajos.forEach((element:any) => {
            var item = {
              'id': element.id,
              'title': element.artista_nombre + ' ' + element.artista_apellido + ' | ' + element.cliente_nombre + ' ' + element.cliente_apellido1,
              'start': element.fecha+'T'+element.horai,
              'end': element.fecha+'T'+element.horaf,
              color: element.artista_color
          }
            this.eventos.push(item);
          });     
          
          this.calendarOptions = {
            headerToolbar: {
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,resourceTimeGridDay,listWeek'
            },
            selectable: true,
            resourceOrder: 'title',
            resources: this.cabinasParaFullCalendar,
            locale: esLocale,
            nowIndicator: true,
            contentHeight: 600,
            businessHours: {
              daysOfWeek: [ 0, 1, 2, 3, 4, 5, 6 ],
              startTime: '09:00',
              endTime: '21:00',
            },
            displayEventTime: true, 
            eventClick: this.eventoClick.bind(this),
            events: this.eventos,
            datesSet: this.handleDates.bind(this)
          };
          
          this.traerClientes();
      });
      }

    }
    setAllWorks(){
      
      if(this.allWorks){
        this.allWorks = 1;
      }else{
        this.allWorks = 0;
      }
      this.loader = true;
      this.getTrabajos();
    }
    deleteElement(event) {
        Swal.fire({
          title: 'Borrar Elemento',
          text: '¿Desea eliminar este elemento?',
          icon: 'question',
          showCancelButton: true,
          confirmButtonColor: '#556ee6',
          confirmButtonText: 'Si, Bórralo!',
          cancelButtonText: 'No, Cancela'}
        ).then((result) => {
          if (result.value) {
              
            this.api.deleteTrabajo(event.id).subscribe( data => {
                this.toastr.success('Trabajo eliminado correctamente', 'Eliminar trabajo');
                this.getTrabajos();
              }, error => {
                this.toastr.error('No se ha podido eliminar el trabajo', 'Eliminar trabajo');
              }
            );
          }
        });
    }

    getCabinas(){
      this.api.getCabinasEstudio(this.user.estudio_id).subscribe( ( data: any ) => {
          this.cabinas = data.response;

          this.cabinasParaFullCalendar.push({
            id: 0,
            title: '0 - Sin cabina'
          });

          if(this.cabinas.length > 0) {
            this.cabinas.forEach((element: any) => {
                var obj = {
                  id: element.id,
                  title: element.nombre,
                };
                this.cabinasParaFullCalendar.push(obj);
              });
          }

      });
    }


    newTrabajo(formValue: any){
      this.loader = true;
      this.isSaving = true; 
      const express: any = {};
      var cliente_value = this.formCliente.value;
      if(!this.cliente_selected && cliente_value.nombre == ''){
        this.toastr.error('Es necesario seleccionar o crear un cliente', 'Crear trabajo');
      }else{
       
        if(!this.cliente_selected){
          express.cliente_new = 1;
          express.cliente = this.formCliente.value;
        }else{
          express.cliente_new = 0;
          express.cliente = this.cliente_selected.id;
        }
        express.trabajo = formValue;
        this.api.newTrabajoExpressCalendar(express).subscribe( (data:any) => {
          this.loader = false;
          this.isSaving = false;
          this.toastr.success('Trabajo creado correctamente', 'Calendario de trabajos');
          this.getTrabajos();
          let elclose: HTMLElement = this.modalNewEventButton.nativeElement;
          elclose.click();
          this.formTrabajo.patchValue({'cabina_id': ''});
          this.formTrabajo.patchValue({'tipo_proyecto': ''});
          this.formTrabajo.patchValue({'fase_cita': ''});
          this.formTrabajo.patchValue({'artista_id': ''});
          this.formTrabajo.patchValue({'descripcion': ''});
          this.formTrabajo.patchValue({'cliente_id': ''});
          this.cliente_selected_id = null;
          this.formCliente.patchValue({'nombre': ''});
          this.formCliente.patchValue({'apellido1': ''});
          }, error => {
            this.loader = false;
            this.isSaving = false; 
            this.toastr.error('No se ha podido crear el trabajo', 'Calendario de trabajos');
          }
        );
      }
      
    }
    cancelarModalUpdate(){
      
      this.value_info.revert();
      let eleditclose: HTMLElement = this.modalEditEventButton.nativeElement;
      eleditclose.click();
    }
    updateTrabajo(){
      this.loader = true;
      this.isUpdating = true;
      this.value_change.aviso_artista = this.aviso_artista;
      this.value_change.aviso_estudio = this.aviso_estudio;
      this.value_change.aviso_cliente = this.aviso_cliente;
      this.api.updateTrabajoExpressCalendar(this.value_change).subscribe( (data:any) => {
        this.loader = false;
        this.isUpdating = false;
        this.toastr.success('Trabajo actualizado correctamente', 'Calendario de trabajos');
        this.getTrabajos();
        let eleditclose: HTMLElement = this.modalEditEventButton.nativeElement;
        eleditclose.click();
        }, error => {
          this.loader = false;
          this.isUpdating = false;
          this.toastr.error('No se ha podido actualizar el trabajo', 'Calendario de trabajos');
        }
      );
    }
    getArtistas(){
      if(this.user.rol_id != 1){
        this.api.getArtistasEstudio(this.user.estudio_id).subscribe( ( data: any ) => {
            this.artistas = data.response;
            this.artistas.forEach(element => {
              element.estilos = JSON.parse(element.estilo_id);
            });
            this.artistas_residentes = this.artistas.filter((x: any) => x.tipoartista_id == 1);
            this.artistas_invitados = this.artistas.filter((x: any) => x.tipoartista_id == 2);
            if(this.user.rol_id == 4){
              this.api.getRoleInfo(this.user.id).subscribe((data: any) => {
                this.roleinfo = data.success.user; 
                if(this.roleinfo?.ver_citas != 1){
                  this.selectedArtista = this.roleinfo.id;
                }
                
               });
            }
        });
      }else{
        this.api.getArtistas().subscribe( ( data: any ) => {
            this.artistas = data.response;
            this.artistas.forEach(element => {
              element.estilos = JSON.parse(element.estilo_id);
            });
            this.artistas_residentes = this.artistas.filter((x: any) => x.tipoartista_id == 1);
            this.artistas_invitados = this.artistas.filter((x: any) => x.tipoartista_id == 2);
        });
      }
    }
    parseDate(fecha){
      return moment(fecha, 'YYYY/MM/DD').format('DD/MM/YYYY');
    }
    checkPendiente(trabajo: any){
      if(moment(trabajo.fecha).isSameOrAfter(moment().format('YYYY-MM-DD'))){
        return true;
      }else{
        return false;
      }
    }
    crearTrabajo(){

    }
    checkCurrent(trabajo: any){
      if(moment(trabajo.fecha).isSame(moment().format('YYYY-MM-DD'))){
        var format = 'hh:mm:ss'
        var time = moment(),
          beforeTime = moment(trabajo.horai, format),
          afterTime = moment(trabajo.horaf, format);
        if (time.isBetween(beforeTime, afterTime)) {
          return true;
        } else {
          return false;
        }
      }else{
        return false;
      }
    }
    isCompleted(trabajo: any){
      if(moment(trabajo.fecha+' '+trabajo.horai).isSameOrBefore(moment().format('YYYY-MM-DD HH:mm:ss'))){
        return true;
      }else{
        return false;
      }
    }
    isFuture(){
      if(moment(this.dia_select).isSameOrAfter(moment().format('YYYY-MM-DD'))){
        return true;
      }else{
        return false;
      }
    }
    cambioArtistaTrabajo(){
      this.loader = true;
      this.getTrabajos();
    }

    // AUSENCIAS
    parseAusencia(fecha: any){
      fecha = moment(fecha,'YYYY-MM-DD').format('DD-MM-YYYY');
      return fecha;
    }

    async handleDates(args:any) {
      var fecha_inicial = args.startStr.split('T', 1);
      var fecha_final = args.endStr.split('T', 1);
      
      // if(args.view.type == 'timeGridDay') {
        // let calendarApi = this.calendarComponent.getApi();
        // console.log(calendarApi.getOption('resources'));
        // calendarApi.setOption('resources', this.cabinasParaFullCalendar);
        // calendarApi.setOption('locale', 'fr');
        // calendarApi.render();
      // }

      if(this.user.rol_id == 2 || this.user.rol_id == 3 ) {
        if(this.user.estudio_id) {
          this.api.getAusenciasArtistasIntervalEstudio(fecha_inicial, fecha_final, this.user.estudio_id).subscribe((data: any) => {
            this.ausencias_mes = data.ausencias;
          });
        } else {
          this.api.getAusenciasArtistasInterval(fecha_inicial, fecha_final).subscribe((data: any) => {
            this.ausencias_mes = data.ausencias;
          });
        }
      }

      
    }
}
